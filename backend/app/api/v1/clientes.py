"""Endpoints de Clientes."""

from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.auth import CurrentUserDep, get_current_user
from app.deps.db import get_session
from app.models.cliente import Cliente
from app.repositories.clientes import ClienteRepository
from app.schemas.cliente import ClienteCreate, ClienteOut, ClienteUpdate

router = APIRouter(prefix="/clientes", tags=["clientes"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[ClienteOut])
async def list_clientes(
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
    busca: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[ClienteOut]:
    repo = ClienteRepository(session)
    items = await repo.list_all(busca=busca, limit=limit, offset=offset)
    return [ClienteOut.model_validate(c) for c in items]


@router.post("", response_model=ClienteOut, status_code=status.HTTP_201_CREATED)
async def create_cliente(
    payload: ClienteCreate,
    user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ClienteOut:
    cliente = Cliente(
        id=uuid4(),
        tenant_id=user.tenant_id,
        **payload.model_dump(),
    )
    session.add(cliente)
    await session.flush()
    return ClienteOut.model_validate(cliente)


@router.get("/{cliente_id}", response_model=ClienteOut)
async def get_cliente(
    cliente_id: UUID,
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ClienteOut:
    repo = ClienteRepository(session)
    cliente = await repo.get_by_id(cliente_id)
    if cliente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return ClienteOut.model_validate(cliente)


@router.patch("/{cliente_id}", response_model=ClienteOut)
async def update_cliente(
    cliente_id: UUID,
    payload: ClienteUpdate,
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ClienteOut:
    repo = ClienteRepository(session)
    cliente = await repo.get_by_id(cliente_id)
    if cliente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(cliente, key, value)
    await session.flush()
    return ClienteOut.model_validate(cliente)
