"""Endpoints de Orçamentos."""

from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.auth import CurrentUserDep, get_current_user
from app.deps.db import get_session
from app.models.orcamento import Orcamento, OrcamentoStatus
from app.repositories.orcamentos import OrcamentoRepository
from app.schemas.orcamento import OrcamentoCreate, OrcamentoOut, OrcamentoUpdate

router = APIRouter(prefix="/orcamentos", tags=["orcamentos"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[OrcamentoOut])
async def list_orcamentos(
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
    status_filter: OrcamentoStatus | None = Query(default=None, alias="status"),
    lead_id: UUID | None = Query(default=None),
) -> list[OrcamentoOut]:
    repo = OrcamentoRepository(session)
    items = await repo.list_all(status=status_filter, lead_id=lead_id)
    return [OrcamentoOut.model_validate(o) for o in items]


@router.post("", response_model=OrcamentoOut, status_code=status.HTTP_201_CREATED)
async def create_orcamento(
    payload: OrcamentoCreate,
    user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OrcamentoOut:
    orc = Orcamento(
        id=uuid4(),
        tenant_id=user.tenant_id,
        criado_por=user.id,
        **payload.model_dump(),
    )
    session.add(orc)
    await session.flush()
    return OrcamentoOut.model_validate(orc)


@router.get("/{oid}", response_model=OrcamentoOut)
async def get_orcamento(
    oid: UUID,
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OrcamentoOut:
    repo = OrcamentoRepository(session)
    orc = await repo.get_by_id(oid)
    if orc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return OrcamentoOut.model_validate(orc)


@router.patch("/{oid}", response_model=OrcamentoOut)
async def update_orcamento(
    oid: UUID,
    payload: OrcamentoUpdate,
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> OrcamentoOut:
    repo = OrcamentoRepository(session)
    orc = await repo.get_by_id(oid)
    if orc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(orc, key, value)
    await session.flush()
    return OrcamentoOut.model_validate(orc)
