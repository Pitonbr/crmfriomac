"""Schemas Pydantic para Leads."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.lead import LeadPrioridade, LeadStatus


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    codigo: str
    codigo_legado: str | None = None
    cliente_id: UUID
    representante_id: UUID | None = None
    stage_id: UUID
    criado_por: UUID | None = None
    projeto: str | None = None
    valor: Decimal
    prioridade: LeadPrioridade
    status: LeadStatus
    motivo_perda: str | None = None
    data_abertura: datetime
    data_ultima_movimentacao: datetime
    sla_deadline: datetime | None = None
    tags: list[str]
    metadados: dict[str, object]
    ganho_em: datetime | None = None
    perdido_em: datetime | None = None
    criado_em: datetime
    atualizado_em: datetime


class LeadCreate(BaseModel):
    cliente_id: UUID
    representante_id: UUID | None = None
    stage_id: UUID
    projeto: str | None = Field(default=None, max_length=80)
    valor: Decimal = Field(default=Decimal("0"), ge=0)
    prioridade: LeadPrioridade = LeadPrioridade.MEDIA
    tags: list[str] = Field(default_factory=list)
    sla_deadline: datetime | None = None


class LeadUpdate(BaseModel):
    cliente_id: UUID | None = None
    representante_id: UUID | None = None
    projeto: str | None = Field(default=None, max_length=80)
    valor: Decimal | None = Field(default=None, ge=0)
    prioridade: LeadPrioridade | None = None
    tags: list[str] | None = None
    sla_deadline: datetime | None = None


class LeadMoveStage(BaseModel):
    stage_id: UUID


class LeadConcluir(BaseModel):
    """Concluir venda (ganho) ou marcar como perdido."""

    resultado: LeadStatus  # ganho | perdido
    motivo_perda: str | None = Field(default=None, max_length=500)


class LeadFilters(BaseModel):
    """Filtros de listagem (query params)."""

    stage_id: UUID | None = None
    representante_id: UUID | None = None
    cliente_id: UUID | None = None
    status: LeadStatus | None = None
    prioridade: LeadPrioridade | None = None
    incluir_excluidos: bool = False
    busca: str | None = None
