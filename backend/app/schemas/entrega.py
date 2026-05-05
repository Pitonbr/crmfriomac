"""Schemas Pydantic para Entregas."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.entrega import EntregaStatus


class EntregaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lead_id: UUID
    prazo_estimado: date | None = None
    prazo_real: date | None = None
    status: EntregaStatus
    observacoes: str | None = None
    criado_em: datetime
    atualizado_em: datetime


class EntregaUpdate(BaseModel):
    prazo_estimado: date | None = None
    prazo_real: date | None = None
    status: EntregaStatus | None = None
    observacoes: str | None = None
