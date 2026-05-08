"""Schemas Pydantic para Leads."""

from datetime import date, datetime
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
    # campos comerciais detalhados
    data_ultimo_contato: datetime | None = None
    tipo_ultimo_contato: str | None = None
    projeto_2d_enviado: bool = False
    projeto_2d_data: date | None = None
    projeto_3d_enviado: bool = False
    projeto_3d_data: date | None = None
    probabilidade_override: Decimal | None = None
    valor_entrada: Decimal | None = None
    percentual_entrada: Decimal | None = None
    forma_pagamento: str | None = None
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
    forma_pagamento: str | None = Field(default=None, max_length=80)
    valor_entrada: Decimal | None = Field(default=None, ge=0)
    percentual_entrada: Decimal | None = Field(default=None, ge=0, le=100)


class LeadUpdate(BaseModel):
    cliente_id: UUID | None = None
    representante_id: UUID | None = None
    projeto: str | None = Field(default=None, max_length=80)
    valor: Decimal | None = Field(default=None, ge=0)
    prioridade: LeadPrioridade | None = None
    tags: list[str] | None = None
    sla_deadline: datetime | None = None
    data_ultimo_contato: datetime | None = None
    tipo_ultimo_contato: str | None = Field(default=None, max_length=30)
    projeto_2d_enviado: bool | None = None
    projeto_2d_data: date | None = None
    projeto_3d_enviado: bool | None = None
    projeto_3d_data: date | None = None
    probabilidade_override: Decimal | None = Field(default=None, ge=0, le=100)
    valor_entrada: Decimal | None = Field(default=None, ge=0)
    percentual_entrada: Decimal | None = Field(default=None, ge=0, le=100)
    forma_pagamento: str | None = Field(default=None, max_length=80)


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
