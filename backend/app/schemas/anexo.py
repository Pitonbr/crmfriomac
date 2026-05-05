"""Schemas Pydantic para Anexos."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AnexoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lead_id: UUID | None = None
    representante_id: UUID | None = None
    nome_arquivo: str
    content_type: str
    tamanho_bytes: int
    autor_id: UUID | None = None
    autor_nome: str
    criado_em: datetime
