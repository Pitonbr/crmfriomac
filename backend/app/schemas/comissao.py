"""Schemas Pydantic para Comissões."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.comissao import ComissaoStatus


class ComissaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    representante_id: UUID
    lead_id: UUID
    orcamento_id: UUID | None = None
    valor_base: Decimal
    percentual: Decimal
    valor_comissao: Decimal
    status: ComissaoStatus
    comprovante_id: UUID | None = None
    data_pagamento: date | None = None
    criado_em: datetime
    atualizado_em: datetime


class ComissaoUpdate(BaseModel):
    status: ComissaoStatus | None = None
    data_pagamento: date | None = None
    comprovante_id: UUID | None = None
