# Friomac CRM — Backend

FastAPI + SQLAlchemy 2.0 (async) + PostgreSQL + Alembic.

## Estrutura (alvo)

```
backend/
├─ app/
│  ├─ main.py                    # FastAPI() + middlewares + routers
│  ├─ config.py                  # Settings via pydantic-settings
│  ├─ logging.py                 # structlog + RequestIdMiddleware
│  ├─ db/                        # session, base, RLS helpers
│  ├─ models/                    # SQLAlchemy models (Sprint 2-3)
│  ├─ schemas/                   # Pydantic DTOs
│  ├─ repositories/              # acesso a dados
│  ├─ services/                  # lógica de negócio
│  ├─ api/v1/                    # routers FastAPI
│  ├─ ws/                        # WebSocket manager
│  ├─ deps/                      # auth, db, tenant
│  ├─ security/                  # passwords, tokens, cookies
│  ├─ integrations/              # whatsapp, email, erp, storage
│  ├─ workers/                   # arq jobs
│  └─ admin/                     # SQLAdmin
├─ tests/
├─ alembic/
└─ pyproject.toml
```

Hoje (Sprint 1) só existe o esqueleto: healthchecks + logging + config.

## Comandos locais (dentro do container)

```bash
uvicorn app.main:app --reload    # dev server
alembic upgrade head             # aplica migrations
alembic revision --autogenerate -m "msg"
pytest                           # testes
ruff check . && ruff format .
mypy app
```

## Variáveis de ambiente

Ver `../.env.example`. Em dev, defaults sãsuficientes (basta `cp .env.example .env`).
