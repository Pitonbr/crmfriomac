"""Repository de Orçamentos."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.orcamento import Orcamento, OrcamentoStatus


class OrcamentoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_all(
        self, *, status: OrcamentoStatus | None = None, lead_id: UUID | None = None
    ) -> list[Orcamento]:
        stmt = select(Orcamento).order_by(Orcamento.criado_em.desc())
        if status:
            stmt = stmt.where(Orcamento.status == status)
        if lead_id:
            stmt = stmt.where(Orcamento.lead_id == lead_id)
        return list((await self.session.execute(stmt)).scalars().all())

    async def get_by_id(self, oid: UUID) -> Orcamento | None:
        return await self.session.get(Orcamento, oid)
