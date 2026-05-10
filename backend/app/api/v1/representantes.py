"""Endpoints de Representantes."""

from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.auth import CurrentUserDep, get_current_user, require_role
from app.deps.db import get_session
from app.models.representante import Representante
from app.models.user import UserRole
from app.repositories.representantes import RepresentanteRepository
from app.schemas.representante import (
    RepresentanteCreate,
    RepresentanteOut,
    RepresentanteUpdate,
)

router = APIRouter(
    prefix="/representantes",
    tags=["representantes"],
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[RepresentanteOut])
async def list_reps(
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
    incluir_inativos: bool = Query(default=False),
) -> list[RepresentanteOut]:
    repo = RepresentanteRepository(session)
    items = await repo.list_all(ativos=not incluir_inativos)
    return [RepresentanteOut.model_validate(r) for r in items]


@router.get("/{rep_id}", response_model=RepresentanteOut)
async def get_rep(
    rep_id: UUID,
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> RepresentanteOut:
    repo = RepresentanteRepository(session)
    rep = await repo.get_by_id(rep_id)
    if rep is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return RepresentanteOut.model_validate(rep)


@router.post(
    "",
    response_model=RepresentanteOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[require_role(UserRole.MASTER)],
)
async def create_rep(
    payload: RepresentanteCreate,
    user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> RepresentanteOut:
    rep = Representante(
        id=uuid4(),
        tenant_id=user.tenant_id,
        **payload.model_dump(),
    )
    session.add(rep)
    await session.flush()
    return RepresentanteOut.model_validate(rep)


@router.patch(
    "/{rep_id}",
    response_model=RepresentanteOut,
    dependencies=[require_role(UserRole.MASTER)],
)
async def update_rep(
    rep_id: UUID,
    payload: RepresentanteUpdate,
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> RepresentanteOut:
    repo = RepresentanteRepository(session)
    rep = await repo.get_by_id(rep_id)
    if rep is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(rep, key, value)
    await session.flush()
    return RepresentanteOut.model_validate(rep)
