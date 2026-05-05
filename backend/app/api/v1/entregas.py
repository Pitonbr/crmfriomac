"""Endpoints de Entregas."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.auth import CurrentUserDep, get_current_user
from app.deps.db import get_session
from app.models.entrega import EntregaStatus
from app.repositories.entregas import EntregaRepository
from app.schemas.entrega import EntregaOut, EntregaUpdate

router = APIRouter(prefix="/entregas", tags=["entregas"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[EntregaOut])
async def list_entregas(
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
    status_filter: EntregaStatus | None = Query(default=None, alias="status"),
) -> list[EntregaOut]:
    repo = EntregaRepository(session)
    items = await repo.list_all(status=status_filter)
    return [EntregaOut.model_validate(e) for e in items]


@router.patch("/{eid}", response_model=EntregaOut)
async def update_entrega(
    eid: UUID,
    payload: EntregaUpdate,
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> EntregaOut:
    repo = EntregaRepository(session)
    e = await repo.get_by_id(eid)
    if e is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(e, key, value)
    await session.flush()
    return EntregaOut.model_validate(e)
