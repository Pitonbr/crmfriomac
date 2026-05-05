"""Dependency `get_session` que aplica RLS automaticamente.

Para rotas autenticadas: `Depends(get_session)` injeta a session já com
`app.tenant_id` / `app.user_id` / `app.role` setados via `SET LOCAL`.

Para rotas anônimas (login, healthcheck): use `get_session_anonymous`.
"""

from collections.abc import AsyncIterator

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.rls import set_rls_context
from app.db.session import SessionLocal


async def get_session_anonymous() -> AsyncIterator[AsyncSession]:
    """Sessão SEM contexto de tenant. Uso restrito (login, healthcheck, public)."""
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    """Sessão autenticada — injeta `app.tenant_id`/`user_id`/`role` na transação.

    Lê o user de `request.state.user` (definido pela dep `get_current_user`).
    Se request não passou por auth, levanta — esta dep é só para rotas privadas.
    """
    user = getattr(request.state, "user", None)
    if user is None:
        raise RuntimeError(
            "get_session requer get_current_user no Depends antes "
            "(ou use get_session_anonymous para rotas públicas)"
        )

    async with SessionLocal() as session:
        try:
            await set_rls_context(
                session, tenant_id=user.tenant_id, user_id=user.id, role=user.role
            )
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


SessionDep = AsyncSession  # alias para tipagem
AnonymousSessionDep = AsyncSession


# Wrappers nomeados para uso no Annotated
def session_dep() -> AsyncIterator[AsyncSession]:
    """Apenas para tipagem — não invocar diretamente."""
    raise NotImplementedError


__all__ = ["get_session", "get_session_anonymous"]
