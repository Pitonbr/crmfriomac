"""FastAPI application entrypoint."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.admin.panel import setup_admin
from app.api.v1 import router as api_v1
from app.config import settings
from app.db.session import engine
from app.integrations.storage import ensure_bucket
from app.logging import RequestIdMiddleware, configure_logging
from app.ws.router import router as ws_router

configure_logging(settings.log_level)
log = structlog.get_logger()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    log.info("app.startup", env=settings.app_env, version=_app.version)

    # Garante bucket MinIO no startup (best-effort)
    try:
        await ensure_bucket()
    except Exception as e:
        log.warning("minio.bootstrap_failed", error=str(e))

    yield
    await engine.dispose()
    log.info("app.shutdown")


app = FastAPI(
    title="Friomac CRM API",
    version="0.3.0",
    description="Backend do Friomac CRM — refrigeração industrial.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# CORS — em dev permite origens explícitas (Vite). Em prod (same-origin via Caddy)
# cors_origins pode ser vazio. allow_credentials=True exige origens explícitas.
_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
if _origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-Id"],
    )

app.add_middleware(RequestIdMiddleware)
app.include_router(api_v1)
app.include_router(ws_router)

# SQLAdmin painel em /admin (restrito a role=master)
setup_admin(app, secret_key=settings.jwt_secret.get_secret_value())


@app.get("/health", tags=["meta"], summary="Liveness probe")
async def health() -> dict[str, str]:
    """Sempre 200 se o processo subiu. Não toca em dependências."""
    return {"status": "ok"}


@app.get("/ready", tags=["meta"], summary="Readiness probe")
async def ready() -> dict[str, object]:
    """Checa dependências (DB; Sprint 5 adiciona Redis)."""
    checks: dict[str, str] = {}

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["db"] = "ok"
    except Exception as e:
        checks["db"] = f"error: {type(e).__name__}"

    status_value = "ready" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": status_value, "checks": checks}
