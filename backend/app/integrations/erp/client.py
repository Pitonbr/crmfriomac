"""ERP Friomac — placeholder.

Quando o user confirmar a spec do ERP (REST/SOAP, endpoints, auth), substituir
NoopErpClient por uma impl real. Por ora, retorna listas vazias.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

import structlog

from app.config import settings

log = structlog.get_logger()


class ErpClient(ABC):
    @abstractmethod
    async def fetch_clientes(self, *, since: str | None = None) -> list[dict[str, Any]]: ...

    @abstractmethod
    async def fetch_pedidos(self, *, since: str | None = None) -> list[dict[str, Any]]: ...


class NoopErpClient(ErpClient):
    async def fetch_clientes(self, *, since: str | None = None) -> list[dict[str, Any]]:
        log.info("erp.noop_fetch_clientes", reason="ERP_BASE_URL não configurado")
        return []

    async def fetch_pedidos(self, *, since: str | None = None) -> list[dict[str, Any]]:
        log.info("erp.noop_fetch_pedidos", reason="ERP_BASE_URL não configurado")
        return []


def get_erp_client() -> ErpClient:
    if not settings.erp_base_url:
        return NoopErpClient()
    # Quando spec for confirmada: return RestErpClient() ou SoapErpClient()
    return NoopErpClient()
