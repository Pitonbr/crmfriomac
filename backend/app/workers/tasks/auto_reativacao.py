"""Job: move leads parados há >90 dias para o stage 'reativacao'.

Roda uma vez por dia via cron do arq.
"""

from datetime import timedelta
from uuid import uuid4

import structlog
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import utcnow
from app.db.session import SessionLocal
from app.models.lead import Lead, LeadStatus
from app.models.observacao import Observacao, ObservacaoTipo
from app.models.stage import Stage
from app.models.tenant import Tenant
from app.ws.events import WsEvent
from app.ws.manager import ws_manager

log = structlog.get_logger()

DIAS_INATIVIDADE = 90
SLUG_REATIVACAO = "reativacao"


async def _set_tenant(session: AsyncSession, tenant_id: object) -> None:
    await session.execute(
        __import__("sqlalchemy").text(f"SET app.tenant_id = '{tenant_id}'")
    )


async def auto_reativar(_ctx: dict) -> dict:  # noqa: ARG001
    """Cron diário: detecta leads EM_ABERTO sem movimentação há >{DIAS_INATIVIDADE} dias
    e os move para o stage 'reativacao', registrando observação de sistema.
    """
    now = utcnow()
    cutoff = now - timedelta(days=DIAS_INATIVIDADE)
    total_movidos = 0

    async with SessionLocal() as session:
        tenants = (await session.execute(select(Tenant.id))).scalars().all()

        for tenant_id in tenants:
            await _set_tenant(session, tenant_id)

            # Busca stage de reativação do tenant
            stage_reativ = (
                await session.execute(
                    select(Stage).where(
                        and_(Stage.tenant_id == tenant_id, Stage.slug == SLUG_REATIVACAO)
                    )
                )
            ).scalar_one_or_none()

            if stage_reativ is None:
                log.warning("auto_reativacao.stage_nao_encontrado", tenant_id=str(tenant_id))
                continue

            # Leads EM_ABERTO já no stage reativacao devem ser ignorados
            stmt = select(Lead).where(
                and_(
                    Lead.tenant_id == tenant_id,
                    Lead.status == LeadStatus.EM_ABERTO,
                    Lead.stage_id != stage_reativ.id,
                    Lead.data_ultima_movimentacao <= cutoff,
                    Lead.excluido_em.is_(None),
                )
            )
            leads_frios = (await session.execute(stmt)).scalars().all()

            for lead in leads_frios:
                old_stage = await session.get(Stage, lead.stage_id)
                old_label = old_stage.label if old_stage else "?"

                lead.stage_id = stage_reativ.id
                lead.data_ultima_movimentacao = now

                session.add(
                    Observacao(
                        id=uuid4(),
                        tenant_id=tenant_id,
                        lead_id=lead.id,
                        autor_id=None,
                        autor_nome="Sistema",
                        texto=(
                            f"Movido automaticamente para Reativação após {DIAS_INATIVIDADE} dias "
                            f"sem movimentação (estava em '{old_label}')."
                        ),
                        tipo=ObservacaoTipo.SISTEMA,
                    )
                )

                await ws_manager.broadcast_tenant(
                    WsEvent(
                        type="lead.stage_moved",
                        tenant_id=tenant_id,
                        actor_id=None,
                        actor_nome="Sistema",
                        payload={
                            "lead_id": str(lead.id),
                            "from_stage_id": str(old_stage.id) if old_stage else "",
                            "to_stage_id": str(stage_reativ.id),
                            "auto": True,
                        },
                    )
                )
                total_movidos += 1

        await session.commit()

    log.info("auto_reativacao.concluido", total_movidos=total_movidos)
    return {"total_movidos": total_movidos}
