"""Cliente WhatsApp Business via Meta Cloud API.

Doc: https://developers.facebook.com/docs/whatsapp/cloud-api/

Estratégia:
- Se WHATSAPP_TOKEN e WHATSAPP_PHONE_ID setados → MetaCloudClient (real).
- Caso contrário → NoopClient (loga e descarta).
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import httpx
import structlog

from app.config import settings

log = structlog.get_logger()


class WhatsAppClient(ABC):
    @abstractmethod
    async def send_text(self, *, to: str, message: str) -> None: ...

    @abstractmethod
    async def send_template(
        self, *, to: str, template_name: str, lang: str, components: list[dict] | None = None
    ) -> None: ...


class NoopClient(WhatsAppClient):
    async def send_text(self, *, to: str, message: str) -> None:
        log.warning(
            "whatsapp.noop_send",
            to=to,
            preview=message[:120],
            reason="WHATSAPP_TOKEN não configurado",
        )

    async def send_template(
        self, *, to: str, template_name: str, lang: str, components: list[dict] | None = None
    ) -> None:
        log.warning(
            "whatsapp.noop_template",
            to=to,
            template=template_name,
            reason="WHATSAPP_TOKEN não configurado",
        )


class MetaCloudClient(WhatsAppClient):
    BASE = "https://graph.facebook.com/v22.0"

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {settings.whatsapp_token.get_secret_value()}",
            "Content-Type": "application/json",
        }

    async def send_text(self, *, to: str, message: str) -> None:
        url = f"{self.BASE}/{settings.whatsapp_phone_id}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": _normalize_phone(to),
            "type": "text",
            "text": {"body": message},
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(url, json=payload, headers=self._headers())
            r.raise_for_status()
            log.info("whatsapp.sent", to=to)

    async def send_template(
        self, *, to: str, template_name: str, lang: str, components: list[dict] | None = None
    ) -> None:
        url = f"{self.BASE}/{settings.whatsapp_phone_id}/messages"
        payload: dict = {
            "messaging_product": "whatsapp",
            "to": _normalize_phone(to),
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": lang},
            },
        }
        if components:
            payload["template"]["components"] = components

        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(url, json=payload, headers=self._headers())
            r.raise_for_status()
            log.info("whatsapp.template_sent", to=to, template=template_name)


def _normalize_phone(phone: str) -> str:
    """Remove non-digits e adiciona país (55 BR) se faltar."""
    digits = "".join(c for c in phone if c.isdigit())
    if not digits.startswith("55") and len(digits) <= 11:
        digits = "55" + digits
    return digits


def get_whatsapp_client() -> WhatsAppClient:
    if settings.whatsapp_token.get_secret_value() and settings.whatsapp_phone_id:
        return MetaCloudClient()
    return NoopClient()
