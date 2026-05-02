# Friomac CRM

Sistema de gestão comercial da **Friomac Indústria** (refrigeração industrial — câmaras frias, expositores, mobília refrigerada).

> ⚠️ **Refatoração em andamento** (branch `refactor/v2`).
> A versão original (vanilla JS) está preservada em [`legacy/`](./legacy/) como referência.
> A versão nova (FastAPI + React + PostgreSQL + Docker) está sendo construída na raiz.

## Visão Geral

CRM multi-tenant com:

- **Funil de vendas Kanban** (8 estágios com SLA por etapa).
- **Gestão de leads, clientes, orçamentos, comissões, prazos de entrega**.
- **Equipe**: vendedores (canal próprio) e representantes (15 territórios).
- **Campanhas e mídias** (origens de leads).
- **Dashboard com KPIs derivados** (meta anual, conversão, ticket médio).
- **Integrações** (Sprint 5): WhatsApp Business, Email transacional, ERP Friomac.

## Stack v2

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.12 + FastAPI + SQLAlchemy 2.0 (async) + Alembic + arq |
| Banco | PostgreSQL 16 (RLS multi-tenant) |
| Frontend | React 18 + Vite + TypeScript strict |
| Anexos | MinIO (S3-compatível) |
| Real-time | WebSocket + Redis pubsub |
| Auth | JWT em cookie HttpOnly + refresh + Argon2 |
| Reverse proxy | Caddy + Let's Encrypt (DNS-01) |
| Admin | SQLAdmin em `/admin` |
| Orquestração | Docker Compose |

Detalhes completos em [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) (Sprint 6).

## Estrutura do Repositório

```
.
├─ legacy/          # v1 vanilla JS (referência)
├─ backend/         # FastAPI app
├─ frontend/        # React app
├─ infra/           # Caddy, nginx, postgres init, backup
├─ scripts/         # Seed, ferramentas operacionais
├─ docs/            # SECURITY.md, ARCHITECTURE.md, RUNBOOK.md, ONBOARDING.md
├─ docker-compose.yml
├─ docker-compose.dev.yml
├─ Makefile
└─ .env.example
```

## Como rodar (em construção)

```bash
cp .env.example .env       # editar segredos
make up                    # docker compose up -d
make migrate               # alembic upgrade head
make seed                  # popula tenant + dados legados
```

URLs:
- App: <http://localhost> (em dev: <http://localhost:5173>)
- API docs: <http://localhost/api/docs>
- Admin: <http://localhost/admin> (somente role `master`)
- MinIO console: <http://localhost:9001>

## Documentação

- [`docs/SECURITY.md`](./docs/SECURITY.md) — postura de segurança e LGPD
- `docs/ARCHITECTURE.md` *(Sprint 6)*
- `docs/RUNBOOK.md` *(Sprint 6)* — backup/restore, troubleshooting
- `docs/ONBOARDING.md` *(Sprint 6)* — como rodar localmente

## Licença

Software proprietário — Friomac Indústria. Todos os direitos reservados.
