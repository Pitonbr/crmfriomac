"""Connection manager — broadcast de eventos por tenant.

Implementação atual: in-memory (single-instance). Para escalar horizontalmente,
adicionar Redis pubsub: cada instância publica em `tenant:{id}` e ouve mensagens
para reenviar aos seus clients locais.
"""

from __future__ import annotations

import asyncio
from collections import defaultdict
from uuid import UUID

import structlog
from fastapi import WebSocket

from app.ws.events import WsEvent

log = structlog.get_logger()


class WsConnectionManager:
    def __init__(self) -> None:
        # tenant_id → user_id → list[WebSocket]
        self._connections: dict[UUID, dict[UUID, list[WebSocket]]] = defaultdict(
            lambda: defaultdict(list)
        )
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket, *, tenant_id: UUID, user_id: UUID) -> None:
        await ws.accept()
        async with self._lock:
            self._connections[tenant_id][user_id].append(ws)
        log.info("ws.connected", tenant_id=str(tenant_id), user_id=str(user_id))

    async def disconnect(self, ws: WebSocket, *, tenant_id: UUID, user_id: UUID) -> None:
        async with self._lock:
            users = self._connections.get(tenant_id)
            if users and user_id in users:
                try:
                    users[user_id].remove(ws)
                except ValueError:
                    pass
                if not users[user_id]:
                    users.pop(user_id, None)
                if not users:
                    self._connections.pop(tenant_id, None)
        log.info("ws.disconnected", tenant_id=str(tenant_id), user_id=str(user_id))

    async def broadcast_tenant(self, event: WsEvent) -> None:
        """Envia o evento para todas as conexões do tenant."""
        users = self._connections.get(event.tenant_id, {})
        # Snapshot da lista (evitar mutação concorrente)
        targets: list[WebSocket] = []
        for sockets in users.values():
            targets.extend(sockets)

        if not targets:
            return

        payload = event.model_dump(mode="json", by_alias=True)
        sends = [self._safe_send(ws, payload) for ws in targets]
        await asyncio.gather(*sends, return_exceptions=True)

    async def send_user(self, *, tenant_id: UUID, user_id: UUID, event: WsEvent) -> None:
        sockets = self._connections.get(tenant_id, {}).get(user_id, [])
        if not sockets:
            return
        payload = event.model_dump(mode="json", by_alias=True)
        sends = [self._safe_send(ws, payload) for ws in list(sockets)]
        await asyncio.gather(*sends, return_exceptions=True)

    @staticmethod
    async def _safe_send(ws: WebSocket, payload: dict[str, object]) -> None:
        try:
            await ws.send_json(payload)
        except Exception as e:
            log.warning("ws.send_failed", error=str(e))


# Singleton global usado pelos services para disparar eventos
ws_manager = WsConnectionManager()
