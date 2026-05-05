"""Endpoints de Comissões."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.auth import CurrentUserDep, get_current_user, require_role
from app.deps.db import get_session
from app.models.comissao import ComissaoStatus
from app.models.user import UserRole
from app.repositories.comissoes import ComissaoRepository
from app.schemas.comissao import ComissaoOut, ComissaoUpdate

router = APIRouter(prefix="/comissoes", tags=["comissoes"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[ComissaoOut])
async def list_comissoes(
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
    representante_id: UUID | None = Query(default=None),
    status_filter: ComissaoStatus | None = Query(default=None, alias="status"),
) -> list[ComissaoOut]:
    repo = ComissaoRepository(session)
    items = await repo.list_all(representante_id=representante_id, status=status_filter)
    return [ComissaoOut.model_validate(c) for c in items]


@router.patch(
    "/{cid}",
    response_model=ComissaoOut,
    dependencies=[require_role(UserRole.MASTER)],
)
async def update_comissao(
    cid: UUID,
    payload: ComissaoUpdate,
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ComissaoOut:
    repo = ComissaoRepository(session)
    c = await repo.get_by_id(cid)
    if c is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(c, key, value)
    await session.flush()
    return ComissaoOut.model_validate(c)
