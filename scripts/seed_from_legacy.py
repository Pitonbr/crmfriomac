"""Seed inicial — cria tenant default + usuários (Sprint 2 mínimo).

Sprint 3 expandirá: representantes, clientes, leads, observações, anexos.

Uso:
    docker compose run --rm backend python -m scripts.seed_from_legacy

O script:
1. Cria tenant default (slug definido em settings.tenant_default_slug).
2. Cria 5 usuários: admin (master), Caio/Felipe/Pedro (vendedores), Lauriberto (representante).
3. Gera senhas Argon2 aleatórias e exibe UMA vez no stdout (capturar manualmente).
4. Idempotente — re-execução não duplica nem altera senhas existentes.
"""

from __future__ import annotations

import asyncio
import secrets
import string
import sys
from dataclasses import dataclass
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import SessionLocal
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.security.passwords import hash_password


@dataclass(frozen=True)
class SeedUser:
    nome: str
    email: str
    role: UserRole
    avatar: str
    grupo: str


SEED_USERS: tuple[SeedUser, ...] = (
    SeedUser("Administrador", "admin@friomac.ind.br", UserRole.MASTER, "AD", "Gestão"),
    SeedUser("Caio Victor Volpiano", "caio@friomac.ind.br", UserRole.VENDEDOR, "CV", "Canal Próprio"),
    SeedUser("Felipe Crescente", "felipe@friomac.ind.br", UserRole.VENDEDOR, "FC", "Canal Próprio"),
    SeedUser(
        "Lauriberto Volpiano",
        "lauriberto@friomac.ind.br",
        UserRole.REPRESENTANTE,
        "LV",
        "Representantes",
    ),
    SeedUser("Pedro Gallucci", "pedro@friomac.ind.br", UserRole.VENDEDOR, "PG", "Canal Próprio"),
)


def gen_password(length: int = 16) -> str:
    """Senha aleatória legível: letras + números + símbolos seguros."""
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


async def ensure_user(session: AsyncSession, tenant: Tenant, seed: SeedUser) -> str | None:
    stmt = select(User).where(User.tenant_id == tenant.id, User.email == seed.email)
    existing = (await session.execute(stmt)).scalar_one_or_none()
    if existing:
        print(f"[seed] user '{seed.email}' já existe — sem alteração")
        return None

    plain = gen_password()
    user = User(
        id=uuid4(),
        tenant_id=tenant.id,
        nome=seed.nome,
        email=seed.email,
        senha_hash=hash_password(plain),
        role=seed.role,
        avatar=seed.avatar,
        grupo=seed.grupo,
        ativo=True,
    )
    session.add(user)
    await session.flush()
    return plain


async def main() -> int:
    async with SessionLocal() as session:
        tenant = await ensure_tenant(session, settings.tenant_default_slug)

        print("\n" + "=" * 60)
        print("CREDENCIAIS GERADAS (anote AGORA — não são exibidas novamente)")
        print("=" * 60)
        novos = 0
        for seed in SEED_USERS:
            plain = await ensure_user(session, tenant, seed)
            if plain:
                print(f"  {seed.role.value:14s}  {seed.email:30s}  senha: {plain}")
                novos += 1
        print("=" * 60)
        print(f"[seed] {novos} novos usuários criados.\n")
        await session.commit()

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
