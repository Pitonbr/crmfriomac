"""Job: varre leads com SLA estourando ou já estourado.

Cria notificação para o criador do lead + dispara WS broadcast.
Roda a cada 10 minutos via cron do arq.
"""

from datetime import timedelta
from uuid import UUID, uuid4

import structlog
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import utcnow
from app.db.session import SessionLocal
from app.models.lead import Lead, LeadStatus
from app.models.notificacao import Notificacao, NotificacaoTipo
from app.models.stage import Stage
from app.models.tenant import Tenant
from app.ws.events import WsEvent
from app.ws.manager import ws_manager

log = structlog.get_logger()


async def scan_sla(_ctx: dict) -> dict:  # noqa: ARG001 — arq passa context
    """Cron: detecta leads com SLA estourado ou prestes a estourar (próx. 1h).

    Para cada lead novo encontrado, cria notificação + emite WS event.
    """
    now = utcnow()
    soon = now + timedelta(hours=1)

    async with SessionLocal() as session:
        # Como roda fora de request, varre TODOS os tenants. Não setamos RLS context.
        # Para evitar problemas de RLS, usamos SUPERUSER (Alembic role) — em prod,
        # dar BYPASSRLS específico ao app_admin.

        # Lista candidatos: leads ativos com sla_deadline <= soon e ainda não notificados.
        # Aqui simplificamos: cada execução cria notifs novas; em prod, dedupe por
        # `metadados['sla_alerted_at']`.

        tenants = (await session.execute(select(Tenant.id))).scalars().all()
        total_alerts = 0

        for tenant_id in tenants:
            await _set_tenant(session, tenant_id)

            stmt = (
                select(Lead, Stage)
                .join(Stage, Stage.id == Lead.stage_id)
                .where(
                    and_(
                        Lead.status == LeadStatus.EM_ABERTO.value,
                        Lead.sla_deadline.is_not(None),
                        Lead.sla_deadline <= soon,
                        Lead.excluido_em.is_(None),
                    )
                )
            )
            rows = (await session.execute(stmt)).all()
            for lead, stage in rows:
                if not lead.criado_por:
                    continue

                tipo = (
                    NotificacaoTipo.SLA_ESTOURADO
                    if lead.sla_deadline and lead.sla_deadline <= now
                    else NotificacaoTipo.SLA_ESTOURANDO
                )
                notif = Notificacao(
                    id=uuid4(),
                    tenant_id=tenant_id,
                    user_id=lead.criado_por,
                    tipo=tipo,
                    titulo=f"SLA do lead #{lead.codigo}",
                    mensagem=(
                        f"Lead {lead.codigo} no estágio '{stage.label}' "
                        f"{'estourou o SLA' if tipo == NotificacaoTipo.SLA_ESTOURADO else 'está prestes a estourar'}."
                    ),
                    link=f"/kanban/leads/{lead.id}",
                )
                session.add(notif)
                await session.flush()

                # Emite via WS (best-effort, mesmo se ws_manager não tiver conexão local)
                await ws_manager.send_user(
                    tenant_id=tenant_id,
                    user_id=lead.criado_por,
                    event=WsEvent(
                        type="notification.new",
                        tenant_id=tenant_id,
                        payload={
                            "id": str(notif.id),
                            "titulo": notif.titulo,
                            "mensagem": notif.mensagem,
                            "link": notif.link,
                            "tipo": tipo,
                        },
                    ),
                )
                total_alerts += 1

        await session.commit()
        log.info("sla.scan_done", alerts_created=total_alerts)
        return {"alerts": total_alerts}


async def _set_tenant(session: AsyncSession, tenant_id: UUID) -> None:
    """Define tenant context na sessão para RLS funcionar."""
    from sqlalchemy import text

    await session.execute(
        text("SELECT set_config('app.tenant_id', :t, true)"),
        {"t": str(tenant_id)},
    )
