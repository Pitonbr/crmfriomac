"""Webhooks de integrações externas — WhatsApp, ERP."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.config import settings
from app.deps.db import get_session_anonymous
from fastapi import Depends

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
log = structlog.get_logger()


# ── WhatsApp Webhook ────────────────────────────────────────────────
@router.get("/whatsapp", summary="Verificação Meta (challenge)")
async def whatsapp_verify(
    hub_mode: str = Query(default="", alias="hub.mode"),
    hub_challenge: str = Query(default="", alias="hub.challenge"),
    hub_verify_token: str = Query(default="", alias="hub.verify_token"),
) -> str:
    """Endpoint de verificação Meta — devolve o challenge se token bater."""
    expected = settings.whatsapp_verify_token.get_secret_value()
    if hub_mode == "subscribe" and hub_verify_token == expected and expected:
        return hub_challenge
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="verify token mismatch")


@router.post("/whatsapp", summary="Recebe mensagens / status updates")
async def whatsapp_receive(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_session_anonymous)],  # noqa: ARG001
) -> dict[str, str]:
    """Recebe payload Meta. Por ora, apenas loga (Sprint 6 mapeia para Observacao)."""
    payload = await request.json()
    log.info("whatsapp.webhook_received", payload=payload)
    return {"status": "ok"}
