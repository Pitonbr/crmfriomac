"""Schemas Pydantic para Notificações."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.notificacao import NotificacaoTipo


class NotificacaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    tipo: NotificacaoTipo
    titulo: str
    mensagem: str
    link: str | None = None
    lida_em: datetime | None = None
    criado_em: datetime


class NotificacoesUnread(BaseModel):
    total: int
    unread: int
    items: list[NotificacaoOut]
