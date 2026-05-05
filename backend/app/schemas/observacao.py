"""Schemas Pydantic para Observações."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.observacao import ObservacaoTipo


class ObservacaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lead_id: UUID
    autor_id: UUID | None = None
    autor_nome: str
    texto: str
    tipo: ObservacaoTipo
    criado_em: datetime


class ObservacaoCreate(BaseModel):
    texto: str = Field(min_length=1, max_length=5000)
    tipo: ObservacaoTipo = ObservacaoTipo.MANUAL
