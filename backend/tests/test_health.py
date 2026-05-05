"""Smoke tests dos healthchecks."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_returns_ok(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_ready_returns_ready(client: AsyncClient) -> None:
    response = await client.get("/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert "checks" in body


@pytest.mark.asyncio
async def test_request_id_is_propagated(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert "x-request-id" in response.headers
    assert len(response.headers["x-request-id"]) > 0


@pytest.mark.asyncio
async def test_request_id_echoed_when_provided(client: AsyncClient) -> None:
    custom = "test-correlation-id-123"
    response = await client.get("/health", headers={"X-Request-Id": custom})
    assert response.headers["x-request-id"] == custom


@pytest.mark.asyncio
async def test_openapi_schema_available(client: AsyncClient) -> None:
    response = await client.get("/api/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "Friomac CRM API"
