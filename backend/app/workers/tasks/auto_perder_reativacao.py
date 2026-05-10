"""Job diário: leads em 'reativação' sem movimentação em >7 dias → perdido.

Garante que leads reativados sejam trabalhados dentro do prazo.
"""

from datetime import timedelta
from uuid import uuid4

import structlog
from sqlalchemy import and_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import utcnow
from app.db.session import SessionLocal
from app.models.lead import Lead, LeadStatus
from app.models.observacao import Observacao, ObservacaoTipo
from app.models.stage import Stage
from app.models.tenant import Tenant

log = structlog.get_logger()

DIAS_LIMITE_REATIVACAO = 7
SLUG_REATIVACAO = "reativacao"
MOTIVO_AUTO = "Sem avanço após reativação (prazo de 7 dias esgotado)"


async def _set_tenant(session: AsyncSession, tenant_id: object) -> None:
    await session.execute(
        text(f"SET app.tenant_id = '{tenant_id}'")
    )


async def auto_perder_reativacao(_ctx: dict) -> dict:  # noqa: ARG001
    """Cron diário: leads no stage 'reativacao' sem movimentação em >7 dias → perdido."""
    now = utcnow()
    cutoff = now - timedelta(days=DIAS_LIMITE_REATIVACAO)
    total_perdidos = 0

    async with SessionLocal() as session:
        tenants = (await session.execute(select(Tenant.id))).scalars().all()

        for tenant_id in tenants:
            await _set_tenant(session, tenant_id)

            stage_reativ = (
                await session.execute(
                    select(Stage).where(
                        and_(Stage.slug == SLUG_REATIVACAO, Stage.tenant_id == tenant_id)
                    )
                )
            ).scalar_one_or_none()

            if stage_reativ is None:
                continue

            leads_vencidos = (
                await session.execute(
                    select(Lead).where(
                        and_(
                            Lead.tenant_id == tenant_id,
                            Lead.stage_id == stage_reativ.id,
                            Lead.status == LeadStatus.EM_ABERTO,
                            Lead.excluido_em.is_(None),
                            Lead.data_ultima_movimentacao <= cutoff,
                        )
                    )
                )
            ).scalars().all()

            for lead in leads_vencidos:
                lead.status = LeadStatus.PERDIDO
                lead.perdido_em = now
                lead.motivo_perda = MOTIVO_AUTO
                lead.data_ultima_movimentacao = now

                session.add(
                    Observacao(
                        id=uuid4(),
                        tenant_id=tenant_id,
                        lead_id=lead.id,
                        autor_id=None,
                        autor_nome="Sistema",
                        texto=f"Lead perdido automaticamente: {MOTIVO_AUTO}.",
                        tipo=ObservacaoTipo.SISTEMA,
                    )
                )
                total_perdidos += 1
                log.info("auto_perder_reativacao", lead_id=str(lead.id), tenant=str(tenant_id))

        await session.commit()

    return {"total_perdidos": total_perdidos}
