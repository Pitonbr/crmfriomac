"""Repository de Comissões."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comissao import Comissao, ComissaoStatus


class ComissaoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_all(
        self,
        *,
        representante_id: UUID | None = None,
        status: ComissaoStatus | None = None,
    ) -> list[Comissao]:
        stmt = select(Comissao).order_by(Comissao.criado_em.desc())
        if representante_id:
            stmt = stmt.where(Comissao.representante_id == representante_id)
        if status:
            stmt = stmt.where(Comissao.status == status)
        return list((await self.session.execute(stmt)).scalars().all())

    async def get_by_id(self, cid: UUID) -> Comissao | None:
        return await self.session.get(Comissao, cid)
