"""Endpoints de Stages."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.auth import CurrentUserDep, get_current_user
from app.deps.db import get_session
from app.repositories.stages import StageRepository
from app.schemas.stage import StageOut

router = APIRouter(prefix="/stages", tags=["stages"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[StageOut])
async def list_stages(
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[StageOut]:
    repo = StageRepository(session)
    items = await repo.list_all(ativos=True)
    return [StageOut.model_validate(s) for s in items]


@router.get("/{stage_id}", response_model=StageOut)
async def get_stage(
    stage_id: str,
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> StageOut:
    from uuid import UUID

    try:
        sid = UUID(stage_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="id inválido") from e

    repo = StageRepository(session)
    stage = await repo.get_by_id(sid)
    if stage is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return StageOut.model_validate(stage)
