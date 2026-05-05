"""Endpoints de Notificações."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.auth import CurrentUserDep, get_current_user
from app.deps.db import get_session
from app.models.notificacao import Notificacao
from app.repositories.notificacoes import NotificacaoRepository
from app.schemas.notificacao import NotificacaoOut, NotificacoesUnread

router = APIRouter(
    prefix="/notificacoes", tags=["notificacoes"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=NotificacoesUnread)
async def list_notificacoes(
    user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
    only_unread: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
) -> NotificacoesUnread:
    repo = NotificacaoRepository(session)
    items = await repo.list_by_user(user.id, only_unread=only_unread, limit=limit)
    unread = await repo.count_unread(user.id)
    return NotificacoesUnread(
        total=len(items),
        unread=unread,
        items=[NotificacaoOut.model_validate(n) for n in items],
    )


@router.post("/{nid}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    nid: UUID,
    user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    n = await session.get(Notificacao, nid)
    if n is None or n.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    repo = NotificacaoRepository(session)
    await repo.mark_as_read(n)
