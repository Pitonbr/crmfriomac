# Onboarding — rodar localmente

## Pré-requisitos

- **Docker Desktop** (Windows/Mac) ou Docker Engine + Compose v2 (Linux). Versão ≥ 20.10.
- **Git** ≥ 2.30.
- Opcional: **Make** (Git Bash, WSL, ou rodar `docker compose` direto).

Espaço em disco: ~3 GB para imagens + volumes.

## Setup (~15 minutos na primeira vez)

```bash
git clone https://github.com/Pitonbr/crmfriomac.git
cd crmfriomac
git checkout refactor/v2

cp .env.example .env
# Editar .env, no mínimo trocar:
#   POSTGRES_PASSWORD=qualquer_coisa_em_dev
#   MINIO_ROOT_PASSWORD=qualquer_coisa_em_dev
#   JWT_SECRET=$(openssl rand -hex 32)   # ou cole 64 chars hex

# Subir stack (build inicial leva 10-15 min — Python deps + Node packages)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# Aplicar migrations
docker compose run --rm backend alembic upgrade head

# Popular dados do legado
docker compose run --rm backend python -m scripts.seed_from_legacy
# IMPORTANTE: ANOTAR as senhas geradas — só aparecem uma vez
```

## URLs (em dev — portas remapeadas para evitar conflitos com serviços locais)

| Serviço | URL | Notas |
|---|---|---|
| Frontend (Vite) | <http://localhost:5174> | Hot reload ativo |
| API Swagger | <http://localhost:8001/api/docs> | OpenAPI interativo |
| API Health | <http://localhost:8001/health> | Sempre 200 |
| API Ready | <http://localhost:8001/ready> | Checa DB |
| SQLAdmin | <http://localhost:8001/admin> | Login com admin via /login do frontend |
| MinIO Console | <http://localhost:9101> | Login: usuário/senha do .env |
| Postgres | `localhost:5433` | psql -U friomac -d friomac |

## Login de teste

Use uma das contas geradas pelo seed. Exemplo (substitua com sua senha):

```
Email: admin@friomac.ind.br
Senha: <gerada pelo seed>
```

## Fluxo de teste rápido

1. Login como admin em <http://localhost:5174/login>.
2. **Dashboard**: KPIs reais — meta anual R$ 12M, total orçado R$ 8.8M, pipeline ponderado R$ 4.4M, gráfico do funil, evolução mensal, top reps.
3. **Sino do header** (canto superior direito): mostra ~62 notificações de SLA estourado (worker arq disparou no boot).
4. **Gestão de Leads**: Kanban com 8 colunas, ~62 cards.
5. **Arrastar um card** entre colunas → backend muda stage + dispara WS event.
6. **Outra aba** com outro usuário (`caio@friomac.ind.br`, senha do seed) → vê o movimento em tempo real.
7. Click em card → `/kanban/leads/{id}` abre **LeadModal** (Radix Dialog com focus trap).
8. **Concluir** como Ganho → cria Entrega + Comissão automaticamente. Verificar em **Comissões** e **Prazo de Entrega**.

## Comandos comuns

```bash
# Logs
docker compose logs -f backend
docker compose logs -f worker

# Shell no backend
docker compose exec backend bash

# Shell no banco
docker compose exec db psql -U friomac -d friomac

# Reaplicar seed (idempotente — não duplica)
docker compose run --rm backend python -m scripts.seed_from_legacy

# Backup manual
docker compose exec pg-backup /usr/local/bin/pg-backup.sh

# Parar tudo
docker compose -f docker-compose.yml -f docker-compose.dev.yml down

# Apagar tudo (DEV — perde dados)
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

## Estrutura para desenvolvedores

Veja:
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — visão geral, camadas, RLS, WS, integrações.
- [`SECURITY.md`](./SECURITY.md) — postura de segurança e LGPD.
- [`RUNBOOK.md`](./RUNBOOK.md) — operação, deploy, backup/restore, troubleshooting.
- [`../legacy/README.md`](../legacy/README.md) — referência da v1 vanilla JS.

## Plano completo

`~/.claude/plans/twinkling-chasing-ember.md` — plano arquitetural original (14 seções, 6 sprints).

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.12 + FastAPI 0.115 + SQLAlchemy 2.0 (async) + Alembic + arq |
| Banco | PostgreSQL 16 + Row-Level Security multi-tenant |
| Frontend | React 18 + Vite 6 + TypeScript strict |
| State server | TanStack Query v5 |
| State client | Zustand |
| UI primitives | Radix UI (Dialog, Popover, Tabs) |
| Charts | Recharts |
| DnD | dnd-kit |
| Forms | React Hook Form + Zod |
| Toast | Sonner |
| Anexos | MinIO (S3-compatível) |
| Real-time | WebSocket nativo FastAPI |
| Auth | JWT em cookie HttpOnly + refresh + Argon2id |
| Reverse proxy | Caddy + Let's Encrypt (prod) |
| Admin | SQLAdmin em /admin |
| Tests back | pytest + httpx + factory-boy |
| Tests front | Vitest + Testing Library + Playwright + axe-core |
