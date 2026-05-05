# Arquitetura

> 📝 **Sprint 6 vai expandir este documento.** Por ora, a referência canônica é o plano de refatoração em `~/.claude/plans/twinkling-chasing-ember.md`.

## Containers (Docker Compose)

| Serviço | Imagem | Função |
|---|---|---|
| `caddy` | `caddy:2-alpine` | Reverse proxy + TLS automático (Let's Encrypt) |
| `frontend` | `friomac/crm-frontend` | nginx servindo build estático Vite |
| `backend` | `friomac/crm-backend` | FastAPI (REST + WebSocket + SQLAdmin) |
| `worker` | `friomac/crm-backend` | arq (jobs assíncronos) |
| `db` | `postgres:16-alpine` | PostgreSQL 16 com RLS |
| `redis` | `redis:7-alpine` | Cache + WS pubsub + arq queue |
| `minio` | `minio/minio` | Object storage S3-compatível (anexos) |
| `pg-backup` | `postgres:16-alpine` | Cron de `pg_dump` diário |

## Camadas (backend)

```
router (api/v1)  →  schema (Pydantic)  →  service  →  repository  →  model (SQLA)
```

## Multi-tenancy

`tenant_id UUID NOT NULL` em todas as tabelas + Postgres RLS. A app conecta com role `app_user` (sem `BYPASSRLS`), e cada request executa `SET LOCAL app.tenant_id = '<uuid>'`. Migrations rodam com `app_admin` (com `BYPASSRLS`).

## Frontend

React 18 + Vite + TypeScript strict. Roteamento via React Router v6 (data router). Estado servidor: TanStack Query. Estado client: Zustand. UI primitives: Radix UI. Drag-and-drop: dnd-kit. Charts: Recharts.

CSS: design system legado preservado integral em `src/styles/legacy.css`. Tokens em `src/styles/tokens.css`. Acessibilidade global em `src/styles/a11y.css`.
