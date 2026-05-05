"""FastAPI application entrypoint.

Sprint 1: apenas healthchecks e logging configurado.
Sprint 2+: routers de auth, leads, etc. são adicionados aqui.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI

from app.config import settings
from app.logging import RequestIdMiddleware, configure_logging

configure_logging(settings.log_level)
log = structlog.get_logger()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Hook de startup/shutdown.

    Sprint 2+: abrir pool DB, conectar Redis, garantir bucket MinIO.
    """
    log.info("app.startup", env=settings.app_env, version=_app.version)
    yield
    log.info("app.shutdown")


app = FastAPI(
    title="Friomac CRM API",
    version="0.1.0",
    description="Backend do Friomac CRM — refrigeração industrial.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(RequestIdMiddleware)


@app.get("/health", tags=["meta"], summary="Liveness probe")
async def health() -> dict[str, str]:
    """Sempre 200 se a aplicação subiu. Não toca em dependências."""
    return {"status": "ok"}


@app.get("/ready", tags=["meta"], summary="Readiness probe")
async def ready() -> dict[str, object]:
    """Verifica dependências (DB, Redis, MinIO).

    Sprint 1: stub que sempre retorna ready=true.
    Sprint 2+: checa cada dep e devolve 503 se falhar.
    """
    return {
        "status": "ready",
        "checks": {
            "db": "skipped",
            "redis": "skipped",
            "minio": "skipped",
        },
    }
