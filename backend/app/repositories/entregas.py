"""Repository de Entregas."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entrega import Entrega, EntregaStatus


class EntregaRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_all(self, *, status: EntregaStatus | None = None) -> list[Entrega]:
        stmt = select(Entrega).order_by(Entrega.prazo_estimado.asc().nulls_last())
        if status:
            stmt = stmt.where(Entrega.status == status)
        return list((await self.session.execute(stmt)).scalars().all())

    async def get_by_id(self, eid: UUID) -> Entrega | None:
        return await self.session.get(Entrega, eid)

    # alias to match API naming convention
    async def get_by_lead_id(self, lead_id: UUID) -> Entrega | None:
        stmt = select(Entrega).where(Entrega.lead_id == lead_id)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def get_by_lead(self, lead_id: UUID) -> Entrega | None:
        stmt = select(Entrega).where(Entrega.lead_id == lead_id)
        return (await self.session.execute(stmt)).scalar_one_or_none()
