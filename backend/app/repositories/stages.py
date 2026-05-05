"""Repository de Stages."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.stage import Stage


class StageRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_all(self, *, ativos: bool = True) -> list[Stage]:
        stmt = select(Stage).order_by(Stage.ordem)
        if ativos:
            stmt = stmt.where(Stage.ativo.is_(True))
        return list((await self.session.execute(stmt)).scalars().all())

    async def get_by_id(self, stage_id: UUID) -> Stage | None:
        return await self.session.get(Stage, stage_id)

    async def get_by_slug(self, slug: str) -> Stage | None:
        stmt = select(Stage).where(Stage.slug == slug)
        return (await self.session.execute(stmt)).scalar_one_or_none()
