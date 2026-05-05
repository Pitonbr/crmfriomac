"""Repository de Leads."""

from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead, LeadPrioridade, LeadStatus
from app.schemas.lead import LeadFilters


class LeadRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_all(
        self, filters: LeadFilters, *, limit: int = 500, offset: int = 0
    ) -> list[Lead]:
        stmt = select(Lead).order_by(Lead.data_abertura.desc())

        # Soft-delete: exclui excluido_em IS NOT NULL por padrão
        if not filters.incluir_excluidos:
            stmt = stmt.where(Lead.excluido_em.is_(None))

        if filters.stage_id:
            stmt = stmt.where(Lead.stage_id == filters.stage_id)
        if filters.representante_id:
            stmt = stmt.where(Lead.representante_id == filters.representante_id)
        if filters.cliente_id:
            stmt = stmt.where(Lead.cliente_id == filters.cliente_id)
        if filters.status:
            stmt = stmt.where(Lead.status == filters.status)
        if filters.prioridade:
            stmt = stmt.where(Lead.prioridade == filters.prioridade)
        if filters.busca:
            pattern = f"%{filters.busca.lower()}%"
            stmt = stmt.where(
                or_(
                    Lead.codigo.ilike(pattern),
                    Lead.projeto.ilike(pattern),
                )
            )

        stmt = stmt.limit(limit).offset(offset)
        return list((await self.session.execute(stmt)).scalars().all())

    async def get_by_id(self, lead_id: UUID) -> Lead | None:
        lead = await self.session.get(Lead, lead_id)
        if lead is None or lead.excluido_em is not None:
            return None
        return lead

    async def add(self, lead: Lead) -> Lead:
        self.session.add(lead)
        await self.session.flush()
        return lead

    async def soft_delete(self, lead: Lead) -> None:
        from app.db.base import utcnow

        lead.excluido_em = utcnow()
        await self.session.flush()

    async def next_codigo(self, *, prefixo: str = "") -> str:
        """Gera código sequencial simples (max+1)."""
        from sqlalchemy import func

        stmt = select(func.coalesce(func.max(Lead.codigo), "0"))
        last = (await self.session.execute(stmt)).scalar_one()
        try:
            return f"{prefixo}{int(str(last).lstrip(prefixo or '')) + 1}"
        except ValueError:
            return f"{prefixo}1"
