"""Endpoints de Entregas."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.auth import CurrentUserDep, get_current_user
from app.deps.db import get_session
from app.models.entrega import EntregaStatus
from app.models.entrega import Entrega
from app.repositories.entregas import EntregaRepository
from app.repositories.leads import LeadRepository
from app.schemas.entrega import EntregaCreate, EntregaOut, EntregaUpdate

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


@router.post("", response_model=EntregaOut, status_code=status.HTTP_201_CREATED)
async def create_entrega(
    payload: EntregaCreate,
    user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> EntregaOut:
    """Cria entrega manual para um lead. O lead deve existir no tenant."""
    from uuid import uuid4

    lead = await LeadRepository(session).get_by_id(payload.lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="lead não encontrado")

    existing = await EntregaRepository(session).get_by_lead_id(payload.lead_id)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="já existe uma entrega para este lead",
        )

    e = Entrega(
        id=uuid4(),
        tenant_id=user.tenant_id,
        **payload.model_dump(),
    )
    session.add(e)
    await session.flush()
    return EntregaOut.model_validate(e)


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
