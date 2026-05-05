"""FastAPI application entrypoint."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from sqlalchemy import text

from app.api.v1 import router as api_v1
from app.config import settings
from app.db.session import engine
from app.logging import RequestIdMiddleware, configure_logging

configure_logging(settings.log_level)
log = structlog.get_logger()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    log.info("app.startup", env=settings.app_env, version=_app.version)
    yield
    await engine.dispose()
    log.info("app.shutdown")


app = FastAPI(
    title="Friomac CRM API",
    version="0.2.0",
    description="Backend do Friomac CRM — refrigeração industrial.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(RequestIdMiddleware)
app.include_router(api_v1)


@app.get("/health", tags=["meta"], summary="Liveness probe")
async def health() -> dict[str, str]:
    """Sempre 200 se o processo subiu. Não toca em dependências."""
    return {"status": "ok"}


@app.get("/ready", tags=["meta"], summary="Readiness probe")
async def ready() -> dict[str, object]:
    """Verifica DB. Sprint 5 adiciona Redis e MinIO."""
    checks: dict[str, str] = {}

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["db"] = "ok"
    except Exception as e:
        checks["db"] = f"error: {type(e).__name__}"

    status_value = "ready" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": status_value, "checks": checks}
