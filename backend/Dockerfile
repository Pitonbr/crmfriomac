# ════════════════════════════════════════════════════════════════
#  Friomac CRM Backend — Multi-stage Dockerfile
#  Stages: base → dev (com tooling) → runtime (slim, prod)
# ════════════════════════════════════════════════════════════════

FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        tini \
        ca-certificates \
        libpq-dev \
        gcc \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml ./

# ── Stage: dev ──────────────────────────────────────────────────
FROM base AS dev
RUN uv pip install --system ".[dev]"
COPY . .
EXPOSE 8000
ENTRYPOINT ["tini", "--"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ── Stage: runtime (produção) ───────────────────────────────────
FROM base AS runtime
RUN uv pip install --system "." \
    && apt-get purge -y --auto-remove gcc \
    && rm -rf /root/.cache

# Usuário não-root
RUN groupadd -r app && useradd -r -g app -d /app -s /sbin/nologin app

COPY --chown=app:app . .
USER app

EXPOSE 8000

ENTRYPOINT ["tini", "--"]
CMD ["gunicorn", "app.main:app", \
     "-k", "uvicorn.workers.UvicornWorker", \
     "-b", "0.0.0.0:8000", \
     "-w", "2", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
