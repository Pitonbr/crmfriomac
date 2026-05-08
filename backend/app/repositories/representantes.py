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

    async def get_by_nome_parcial(self, nome_parcial: str, tenant_id: UUID) -> Representante | None:
        stmt = (
            select(Representante)
            .where(Representante.tenant_id == tenant_id)
            .where(Representante.nome.ilike(f"%{nome_parcial}%"))
            .where(Representante.ativo.is_(True))
            .limit(1)
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()
