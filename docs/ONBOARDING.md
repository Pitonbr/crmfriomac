# Onboarding — rodar localmente

## Pré-requisitos

- Docker Desktop (Windows/Mac) ou Docker Engine + Compose v2 (Linux)
- Git
- Opcional: `make` (Git Bash, WSL, ou rodar `docker compose` direto)

## Setup (10 minutos)

```bash
git clone https://github.com/Pitonbr/crmfriomac.git
cd crmfriomac
git checkout refactor/v2

cp .env.example .env
# Edite .env e troque valores marcados como "changeme_*"

make dev      # ou: docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

URLs:

- Frontend (Vite dev): <http://localhost:5173>
- Backend (FastAPI): <http://localhost:8000>
  - Docs: <http://localhost:8000/api/docs>
  - Health: <http://localhost:8000/health>
- MinIO console: <http://localhost:9001>
- Postgres: `localhost:5432` (psql)

## Sprint 1 atual

Apenas o esqueleto. Health do backend e tela de boas-vindas do frontend.

## Sprint 2+ (em construção)

- `make migrate` aplica migrations
- `make seed` importa dados legados
- Login funciona em `/login`
