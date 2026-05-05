"""Repository de Clientes."""

from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cliente import Cliente


class ClienteRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_all(
        self, *, busca: str | None = None, limit: int = 200, offset: int = 0
    ) -> list[Cliente]:
        stmt = select(Cliente).order_by(Cliente.nome_fantasia)
        if busca:
            pattern = f"%{busca.lower()}%"
            stmt = stmt.where(
                or_(
                    Cliente.nome_fantasia.ilike(pattern),
                    Cliente.razao_social.ilike(pattern),
                    Cliente.cnpj.ilike(pattern),
                )
            )
        stmt = stmt.limit(limit).offset(offset)
        return list((await self.session.execute(stmt)).scalars().all())

    async def get_by_id(self, cliente_id: UUID) -> Cliente | None:
        return await self.session.get(Cliente, cliente_id)

    async def get_by_nome_fantasia(self, nome: str) -> Cliente | None:
        stmt = select(Cliente).where(Cliente.nome_fantasia == nome)
        return (await self.session.execute(stmt)).scalar_one_or_none()
