"""Seed inicial — popula tenant, stages, users, representantes, clientes, leads, observações.

Lê os dados originais de `legacy/js/data.js` via parser regex.

Uso:
    docker compose run --rm backend python -m scripts.seed_from_legacy

Idempotente: re-execução não duplica nem altera senhas existentes.
"""

from __future__ import annotations

import asyncio
import secrets
import string
import sys
from collections.abc import Iterable
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import SessionLocal
from app.models.cliente import Cliente
from app.models.lead import Lead, LeadPrioridade, LeadStatus
from app.models.observacao import Observacao, ObservacaoTipo
from app.models.representante import CanalRepresentante, Representante
from app.models.stage import Stage
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.security.passwords import hash_password
from scripts.legacy_parser import load_legacy_data


# ── stages padrão (do design original) ─────────────────────────────
STAGES_SEED: tuple[dict[str, Any], ...] = (
    {"slug": "novo_lead", "label": "Novo Lead", "icone": "📥", "sla_horas": 2, "cor": "#0EA5E9", "prob_pct": 10, "ordem": 1},
    {"slug": "visita_loco", "label": "Visita In Loco", "icone": "🏢", "sla_horas": 72, "cor": "#7C3AED", "prob_pct": 25, "ordem": 2},
    {"slug": "orcamento_env", "label": "Orçamento Enviado", "icone": "📄", "sla_horas": 24, "cor": "#0D9488", "prob_pct": 40, "ordem": 3},
    {"slug": "follow_up", "label": "Follow Up", "icone": "📞", "sla_horas": 48, "cor": "#D97706", "prob_pct": 55, "ordem": 4},
    {"slug": "pre_projeto", "label": "Pré-Projeto 2D/3D", "icone": "📐", "sla_horas": 72, "cor": "#E8500A", "prob_pct": 70, "ordem": 5},
    {"slug": "visita_fech", "label": "Visita Fechamento", "icone": "🤝", "sla_horas": 48, "cor": "#DC2626", "prob_pct": 80, "ordem": 6},
    {"slug": "contrato_env", "label": "Contrato Enviado", "icone": "📋", "sla_horas": 24, "cor": "#16A34A", "prob_pct": 90, "ordem": 7},
    {"slug": "decisao_final", "label": "Decisão Final", "icone": "✅", "sla_horas": 0, "cor": "#15803D", "prob_pct": 100, "ordem": 8},
)


# Mapeamento role-text → enum
ROLE_MAP = {
    "master": UserRole.MASTER,
    "vendedor": UserRole.VENDEDOR,
    "representante": UserRole.REPRESENTANTE,
}

CANAL_MAP = {
    "Canal Próprio": CanalRepresentante.CANAL_PROPRIO,
    "Representante": CanalRepresentante.REPRESENTANTE,
}

PRIORIDADE_MAP = {
    "baixa": LeadPrioridade.BAIXA,
    "média": LeadPrioridade.MEDIA,
    "media": LeadPrioridade.MEDIA,
    "alta": LeadPrioridade.ALTA,
}


def gen_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%&*"
    while True:
        pw = "".join(secrets.choice(alphabet) for _ in range(length))
        if (
            any(c.islower() for c in pw)
            and any(c.isupper() for c in pw)
            and any(c.isdigit() for c in pw)
        ):
            return pw


async def ensure_tenant(session: AsyncSession, slug: str) -> Tenant:
    stmt = select(Tenant).where(Tenant.slug == slug)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        print(f"[seed] tenant '{slug}' já existe — id={existing.id}")
        return existing
    tenant = Tenant(id=uuid4(), nome="Friomac Indústria", slug=slug, ativo=True)
    session.add(tenant)
    await session.flush()
    print(f"[seed] tenant '{slug}' CRIADO — id={tenant.id}")
    return tenant


async def ensure_stages(session: AsyncSession, tenant: Tenant) -> dict[str, Stage]:
    stmt = select(Stage).where(Stage.tenant_id == tenant.id)
    existing = {s.slug: s for s in (await session.execute(stmt)).scalars().all()}
    for spec in STAGES_SEED:
        if spec["slug"] in existing:
            continue
        stage = Stage(id=uuid4(), tenant_id=tenant.id, ativo=True, **spec)
        session.add(stage)
        existing[spec["slug"]] = stage
    await session.flush()
    print(f"[seed] {len(existing)} stages garantidos")
    return existing


async def ensure_users(
    session: AsyncSession, tenant: Tenant, legacy_users: list[dict[str, Any]]
) -> dict[str, tuple[User, str | None]]:
    """Retorna mapping legacy_id → (User, senha_plana_se_nova)."""
    out: dict[str, tuple[User, str | None]] = {}
    for u in legacy_users:
        stmt = select(User).where(
            User.tenant_id == tenant.id, User.email == u["email"].lower()
        )
        existing = (await session.execute(stmt)).scalar_one_or_none()
        if existing:
            out[u["id"]] = (existing, None)
            continue

        plain = gen_password()
        user = User(
            id=uuid4(),
            tenant_id=tenant.id,
            nome=u.get("nome", u["email"]),
            email=u["email"].lower(),
            senha_hash=hash_password(plain),
            role=ROLE_MAP.get(u.get("role", "vendedor"), UserRole.VENDEDOR),
            avatar=u.get("avatar"),
            grupo=u.get("grupo"),
            ativo=True,
        )
        session.add(user)
        out[u["id"]] = (user, plain)
    await session.flush()
    return out


async def ensure_representantes(
    session: AsyncSession,
    tenant: Tenant,
    legacy_reps: list[dict[str, Any]],
    users_by_email: dict[str, User],
) -> dict[str, Representante]:
    """Retorna mapping legacy_rep_id → Representante."""
    stmt = select(Representante).where(Representante.tenant_id == tenant.id)
    by_nome = {r.nome: r for r in (await session.execute(stmt)).scalars().all()}

    out: dict[str, Representante] = {}
    for r in legacy_reps:
        nome = r["nome"]
        existing = by_nome.get(nome)
        if existing:
            out[r["id"]] = existing
            continue

        canal = CANAL_MAP.get(r.get("canal", "Representante"), CanalRepresentante.REPRESENTANTE)
        user = users_by_email.get((r.get("email") or "").lower()) if r.get("email") else None
        rep = Representante(
            id=uuid4(),
            tenant_id=tenant.id,
            user_id=user.id if user else None,
            nome=nome,
            canal=canal,
            comissao_pct=Decimal(str(r.get("comissao", 0))),
            cidade=r.get("cidade"),
            estado=r.get("estado"),
            email=r.get("email") or None,
            telefone=r.get("tel") or None,
            ativo=True,
        )
        session.add(rep)
        out[r["id"]] = rep
    await session.flush()
    print(f"[seed] {len(out)} representantes garantidos")
    return out


async def ensure_clientes(
    session: AsyncSession, tenant: Tenant, legacy_leads: Iterable[dict[str, Any]]
) -> dict[str, Cliente]:
    """Constrói clientes deduplicando por nome_fantasia. Retorna mapping nome→cliente."""
    stmt = select(Cliente).where(Cliente.tenant_id == tenant.id)
    by_nome = {c.nome_fantasia: c for c in (await session.execute(stmt)).scalars().all()}

    for l in legacy_leads:
        key = (l.get("nomFantasia") or l.get("cliente") or "").strip()
        if not key or key in by_nome:
            continue
        cli = Cliente(
            id=uuid4(),
            tenant_id=tenant.id,
            nome_fantasia=key,
            razao_social=l.get("cliente") if l.get("cliente") != key else None,
            nome_contato=l.get("nomeCliente") or None,
            email=l.get("email") or None,
            telefone=l.get("tel") or None,
            canal=l.get("canal"),
            segmento=(l.get("tags") or [None])[0],
            ativo=True,
        )
        session.add(cli)
        by_nome[key] = cli
    await session.flush()
    print(f"[seed] {len(by_nome)} clientes garantidos")
    return by_nome


async def ensure_leads(
    session: AsyncSession,
    tenant: Tenant,
    legacy_leads: list[dict[str, Any]],
    stages: dict[str, Stage],
    reps: dict[str, Representante],
    clientes: dict[str, Cliente],
    admin_user: User,
) -> int:
    stmt = select(Lead.codigo_legado).where(
        Lead.tenant_id == tenant.id, Lead.codigo_legado.is_not(None)
    )
    existing_codes = set((await session.execute(stmt)).scalars().all())

    inserted = 0
    for l in legacy_leads:
        if l["id"] in existing_codes:
            continue

        cli_key = (l.get("nomFantasia") or l.get("cliente") or "").strip()
        cliente = clientes.get(cli_key)
        if cliente is None:
            print(f"[seed] WARN: lead {l['id']} sem cliente '{cli_key}'")
            continue

        stage_slug = l.get("etapa") or "novo_lead"
        stage = stages.get(stage_slug)
        if stage is None:
            print(f"[seed] WARN: lead {l['id']} stage desconhecido '{stage_slug}'")
            continue

        rep_legacy = l.get("vendedor")
        rep = reps.get(rep_legacy) if rep_legacy else None

        try:
            data_abertura = datetime.fromisoformat(l["dataAbertura"]).replace(tzinfo=UTC)
        except (KeyError, ValueError):
            data_abertura = datetime.now(UTC)

        sla = (
            data_abertura + timedelta(hours=stage.sla_horas)
            if stage.sla_horas > 0
            else None
        )

        prio = PRIORIDADE_MAP.get(l.get("prioridade", "media"), LeadPrioridade.MEDIA)

        lead = Lead(
            id=uuid4(),
            tenant_id=tenant.id,
            codigo=l["id"],
            codigo_legado=l["id"],
            cliente_id=cliente.id,
            representante_id=rep.id if rep else None,
            stage_id=stage.id,
            criado_por=admin_user.id,
            projeto=l.get("projeto") or None,
            valor=Decimal(str(l.get("valor", 0))),
            prioridade=prio,
            status=LeadStatus.EM_ABERTO,
            data_abertura=data_abertura,
            data_ultima_movimentacao=data_abertura,
            sla_deadline=sla,
            tags=l.get("tags") or [],
            metadados={"legacy_canal": l.get("canal"), "legacy_mes": l.get("mes")},
        )
        session.add(lead)
        await session.flush()

        # Observação inicial se houver `obs`
        if l.get("obs"):
            session.add(
                Observacao(
                    id=uuid4(),
                    tenant_id=tenant.id,
                    lead_id=lead.id,
                    autor_id=admin_user.id,
                    autor_nome=admin_user.nome,
                    texto=str(l["obs"]),
                    tipo=ObservacaoTipo.MANUAL,
                )
            )

        inserted += 1
    await session.flush()
    return inserted


async def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    legacy_dir = repo_root / "legacy"
    if not legacy_dir.exists():
        # Quando rodando dentro do container, montagem pode estar em outro lugar
        legacy_dir = Path("/legacy")

    print(f"[seed] lendo dados legados de: {legacy_dir}")
    legacy = load_legacy_data(legacy_dir)
    print(
        f"[seed] parseado: {len(legacy['users'])} users, "
        f"{len(legacy['reps'])} reps, {len(legacy['leads'])} leads"
    )

    async with SessionLocal() as session:
        tenant = await ensure_tenant(session, settings.tenant_default_slug)
        stages = await ensure_stages(session, tenant)
        users_map = await ensure_users(session, tenant, legacy["users"])

        users_by_email = {u.email.lower(): u for u, _ in users_map.values()}
        admin_user = next(
            (u for u, _ in users_map.values() if u.role == UserRole.MASTER), None
        )
        if admin_user is None:
            print("[seed] ERRO: nenhum user master encontrado")
            return 1

        reps = await ensure_representantes(session, tenant, legacy["reps"], users_by_email)
        clientes = await ensure_clientes(session, tenant, legacy["leads"])
        n = await ensure_leads(
            session, tenant, legacy["leads"], stages, reps, clientes, admin_user
        )
        print(f"[seed] {n} leads novos inseridos")

        # Imprime senhas geradas (apenas as novas)
        new_creds = [(u, p) for u, p in users_map.values() if p is not None]
        if new_creds:
            print("\n" + "=" * 70)
            print("CREDENCIAIS GERADAS (anote AGORA — não são exibidas novamente)")
            print("=" * 70)
            for u, p in new_creds:
                print(f"  {u.role.value:14s}  {u.email:32s}  senha: {p}")
            print("=" * 70 + "\n")

        await session.commit()

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
