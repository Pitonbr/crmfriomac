"""Endpoints de Leads."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.auth import CurrentUserDep, get_current_user
from app.deps.db import get_session
from app.models.lead import LeadPrioridade, LeadStatus
from app.repositories.leads import LeadRepository
from app.repositories.observacoes import ObservacaoRepository
from app.schemas.lead import (
    LeadConcluir,
    LeadCreate,
    LeadFilters,
    LeadMoveStage,
    LeadOut,
    LeadUpdate,
)
from app.schemas.observacao import ObservacaoCreate, ObservacaoOut
from app.services.leads import (
    InvalidTransition,
    LeadNotFound,
    LeadService,
    StageNotFound,
)

router = APIRouter(prefix="/leads", tags=["leads"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[LeadOut])
async def list_leads(
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
    stage_id: UUID | None = Query(default=None),
    representante_id: UUID | None = Query(default=None),
    cliente_id: UUID | None = Query(default=None),
    status_filter: LeadStatus | None = Query(default=None, alias="status"),
    prioridade: LeadPrioridade | None = Query(default=None),
    incluir_excluidos: bool = Query(default=False),
    busca: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=500, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> list[LeadOut]:
    filters = LeadFilters(
        stage_id=stage_id,
        representante_id=representante_id,
        cliente_id=cliente_id,
        status=status_filter,
        prioridade=prioridade,
        incluir_excluidos=incluir_excluidos,
        busca=busca,
    )
    repo = LeadRepository(session)
    items = await repo.list_all(filters, limit=limit, offset=offset)
    return [LeadOut.model_validate(l) for l in items]


@router.post("", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
async def create_lead(
    payload: LeadCreate,
    user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LeadOut:
    service = LeadService(session)
    try:
        lead = await service.create(
            tenant_id=user.tenant_id,
            criado_por=user.id,
            autor_nome=user.nome,
            payload=payload,
        )
    except StageNotFound as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    return LeadOut.model_validate(lead)


@router.get("/{lead_id}", response_model=LeadOut)
async def get_lead(
    lead_id: UUID,
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LeadOut:
    repo = LeadRepository(session)
    lead = await repo.get_by_id(lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return LeadOut.model_validate(lead)


@router.patch("/{lead_id}", response_model=LeadOut)
async def update_lead(
    lead_id: UUID,
    payload: LeadUpdate,
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LeadOut:
    repo = LeadRepository(session)
    lead = await repo.get_by_id(lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(lead, key, value)
    from app.db.base import utcnow

    lead.data_ultima_movimentacao = utcnow()
    await session.flush()
    return LeadOut.model_validate(lead)


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lead(
    lead_id: UUID,
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    repo = LeadRepository(session)
    lead = await repo.get_by_id(lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await repo.soft_delete(lead)


@router.post("/{lead_id}/move-stage", response_model=LeadOut)
async def move_stage(
    lead_id: UUID,
    payload: LeadMoveStage,
    user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LeadOut:
    service = LeadService(session)
    try:
        lead = await service.move_stage(
            tenant_id=user.tenant_id,
            lead_id=lead_id,
            new_stage_id=payload.stage_id,
            autor_id=user.id,
            autor_nome=user.nome,
        )
    except LeadNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except StageNotFound as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except InvalidTransition as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e
    return LeadOut.model_validate(lead)


@router.post("/{lead_id}/concluir", response_model=LeadOut)
async def concluir_lead(
    lead_id: UUID,
    payload: LeadConcluir,
    user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LeadOut:
    service = LeadService(session)
    try:
        lead = await service.concluir(
            tenant_id=user.tenant_id,
            lead_id=lead_id,
            resultado=payload.resultado,
            motivo_perda=payload.motivo_perda,
            autor_id=user.id,
            autor_nome=user.nome,
        )
    except LeadNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except InvalidTransition as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e
    return LeadOut.model_validate(lead)


# ── Observações do lead ────────────────────────────────────────────
@router.get("/{lead_id}/observacoes", response_model=list[ObservacaoOut])
async def list_observacoes(
    lead_id: UUID,
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[ObservacaoOut]:
    repo = ObservacaoRepository(session)
    items = await repo.list_by_lead(lead_id)
    return [ObservacaoOut.model_validate(o) for o in items]


@router.post(
    "/{lead_id}/observacoes",
    response_model=ObservacaoOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_observacao(
    lead_id: UUID,
    payload: ObservacaoCreate,
    user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ObservacaoOut:
    from uuid import uuid4

    from app.models.observacao import Observacao

    repo_lead = LeadRepository(session)
    if (await repo_lead.get_by_id(lead_id)) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="lead não encontrado")

    obs = Observacao(
        id=uuid4(),
        tenant_id=user.tenant_id,
        lead_id=lead_id,
        autor_id=user.id,
        autor_nome=user.nome,
        texto=payload.texto,
        tipo=payload.tipo,
    )
    repo = ObservacaoRepository(session)
    await repo.add(obs)
    return ObservacaoOut.model_validate(obs)
