"""Repository de Representantes."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.representante import Representante


class RepresentanteRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_all(self, *, ativos: bool = True) -> list[Representante]:
        stmt = select(Representante).order_by(Representante.nome)
        if ativos:
            stmt = stmt.where(Representante.ativo.is_(True))
        return list((await self.session.execute(stmt)).scalars().all())

    async def get_by_id(self, rep_id: UUID) -> Representante | None:
        return await self.session.get(Representante, rep_id)
