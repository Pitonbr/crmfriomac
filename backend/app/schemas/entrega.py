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
    retrabalho: bool = False
    retrabalho_desc: str | None = None
    satisfacao: int | None = None
    criado_em: datetime
    atualizado_em: datetime


class EntregaCreate(BaseModel):
    lead_id: UUID
    prazo_estimado: date | None = None
    prazo_real: date | None = None
    status: EntregaStatus = EntregaStatus.PLANEJADA
    observacoes: str | None = None
    retrabalho: bool = False
    retrabalho_desc: str | None = None
    satisfacao: int | None = None


class EntregaUpdate(BaseModel):
    prazo_estimado: date | None = None
    prazo_real: date | None = None
    status: EntregaStatus | None = None
    observacoes: str | None = None
    retrabalho: bool | None = None
    retrabalho_desc: str | None = None
    satisfacao: int | None = None
