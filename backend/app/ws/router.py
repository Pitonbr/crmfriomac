"""Endpoint WebSocket `/ws` autenticado via cookie HttpOnly.

O navegador envia automaticamente os cookies do mesmo origin no handshake.
Validamos o cookie de access; se falhar, fechamos com código 4401 (custom).
"""

from typing import Annotated

import structlog
from fastapi import APIRouter, Cookie, WebSocket, WebSocketDisconnect, status

from app.repositories.auth import UserRepository
from app.security.cookies import ACCESS_COOKIE
from app.security.tokens import TokenError, decode_token
from app.ws.manager import ws_manager
from app.db.session import SessionLocal

router = APIRouter(tags=["ws"])
log = structlog.get_logger()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    friomac_access: Annotated[str | None, Cookie(alias=ACCESS_COOKIE)] = None,
) -> None:
    if not friomac_access:
        await websocket.close(code=4401)
        return

    try:
        payload = decode_token(friomac_access, expected_type="access")
    except TokenError:
        await websocket.close(code=4401)
        return

    # Verifica se o usuário ainda está ativo
    async with SessionLocal() as session:
        user = await UserRepository(session).get_by_id(payload.sub)
        if user is None or not user.ativo:
            await websocket.close(code=4401)
            return

    await ws_manager.connect(websocket, tenant_id=payload.tenant_id, user_id=payload.sub)
    try:
        while True:
            # Heartbeat / ack do cliente. Ignoramos conteúdo; basta manter viva.
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(
            websocket, tenant_id=payload.tenant_id, user_id=payload.sub
        )
