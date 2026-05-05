"""Fixtures globais.

Sprint 1: apenas client HTTP para testar healthchecks.
Sprint 2+: fixtures de DB, tenant, user autenticado.
"""

from collections.abc import AsyncIterator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    """HTTP client async para testes contra a app FastAPI in-process."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
