"""Repository de Observações."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.observacao import Observacao


class ObservacaoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_by_lead(self, lead_id: UUID) -> list[Observacao]:
        stmt = (
            select(Observacao)
            .where(Observacao.lead_id == lead_id)
            .order_by(Observacao.criado_em.desc())
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def add(self, obs: Observacao) -> Observacao:
        self.session.add(obs)
        await self.session.flush()
        return obs
