"""Repository de Notificações."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import utcnow
from app.models.notificacao import Notificacao


class NotificacaoRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_by_user(
        self, user_id: UUID, *, limit: int = 50, only_unread: bool = False
    ) -> list[Notificacao]:
        stmt = (
            select(Notificacao)
            .where(Notificacao.user_id == user_id)
            .order_by(Notificacao.criado_em.desc())
            .limit(limit)
        )
        if only_unread:
            stmt = stmt.where(Notificacao.lida_em.is_(None))
        return list((await self.session.execute(stmt)).scalars().all())

    async def add(self, n: Notificacao) -> Notificacao:
        self.session.add(n)
        await self.session.flush()
        return n

    async def mark_as_read(self, notif: Notificacao) -> None:
        notif.lida_em = utcnow()
        await self.session.flush()

    async def count_unread(self, user_id: UUID) -> int:
        from sqlalchemy import func

        stmt = (
            select(func.count(Notificacao.id))
            .where(Notificacao.user_id == user_id, Notificacao.lida_em.is_(None))
        )
        return int((await self.session.execute(stmt)).scalar() or 0)
