"""Tipagem dos eventos transportados via WebSocket.

Eventos seguem o padrão `<recurso>.<acao>` (e.g. `lead.created`).
"""

from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

EventType = Literal[
    "lead.created",
    "lead.updated",
    "lead.stage_moved",
    "lead.deleted",
    "lead.concluded",
    "observacao.added",
    "notification.new",
]


class WsEvent(BaseModel):
    """Envelope de evento WS — sempre carrega quem disparou (actor) e o tenant."""

    model_config = ConfigDict(populate_by_name=True)

    type: EventType
    tenant_id: UUID = Field(alias="tenantId")
    actor_id: UUID | None = Field(default=None, alias="actorId")
    actor_nome: str | None = Field(default=None, alias="actorNome")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    payload: dict[str, object] = Field(default_factory=dict)
