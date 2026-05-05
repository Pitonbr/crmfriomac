"""Schemas Pydantic para Orçamentos."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.orcamento import OrcamentoStatus


class OrcamentoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lead_id: UUID
    numero: str
    versao: int
    valor_total: Decimal
    status: OrcamentoStatus
    data_envio: datetime | None = None
    validade_ate: date | None = None
    observacoes: str | None = None
    criado_por: UUID | None = None
    criado_em: datetime
    atualizado_em: datetime


class OrcamentoCreate(BaseModel):
    lead_id: UUID
    numero: str = Field(min_length=1, max_length=40)
    valor_total: Decimal = Field(default=Decimal("0"), ge=0)
    validade_ate: date | None = None
    observacoes: str | None = None
    status: OrcamentoStatus = OrcamentoStatus.RASCUNHO


class OrcamentoUpdate(BaseModel):
    valor_total: Decimal | None = Field(default=None, ge=0)
    status: OrcamentoStatus | None = None
    data_envio: datetime | None = None
    validade_ate: date | None = None
    observacoes: str | None = None
