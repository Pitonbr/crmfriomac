# Arquitetura — Friomac CRM v2

> Última revisão: 2026-05-05 (refactor/v2 — 7 sprints completos)

## 1. Visão geral

Sistema de gestão comercial multi-tenant (Friomac Indústria — câmaras frias, expositores, mobília refrigerada), composto por:

- **Backend**: API REST + WebSocket em FastAPI/Python 3.12, com PostgreSQL 16 e Row-Level Security multi-tenant.
- **Frontend**: SPA React 18 + Vite + TypeScript strict, design system preservado da v1 (vanilla JS).
- **Storage de anexos**: MinIO (S3-compatível).
- **Cache + jobs**: Redis + arq workers (cron de SLA, fila de e-mail, sync ERP).
- **Reverse proxy + TLS**: Caddy com Let's Encrypt automático (DNS-01) em prod.
- **Admin**: SQLAdmin embutido em `/admin`.

```
Browser ── HTTPS ── Caddy ──┬── nginx (frontend SPA)
                            └── FastAPI (API + WS + SQLAdmin)
                                  ├── PostgreSQL (RLS multi-tenant)
                                  ├── Redis (cache + arq queue + WS pubsub)
                                  └── MinIO (anexos)

worker (arq) ── Redis + Postgres + (WhatsApp/SMTP/ERP via NoOp ou real)
pg-backup (cron) ── pg_dump diário em volume
```

## 2. Containers (Docker Compose)

| Serviço | Imagem | Função | Healthcheck |
|---|---|---|---|
| `caddy` | `caddy:2-alpine` | Reverse proxy + TLS | — |
| `frontend` | `friomac/crm-frontend` | nginx servindo build estático Vite | `wget /health` |
| `backend` | `friomac/crm-backend` | FastAPI (REST + WS + SQLAdmin) | `curl /ready` |
| `worker` | `friomac/crm-backend` | `arq` jobs assíncronos | — |
| `db` | `postgres:16-alpine` | PostgreSQL 16 com RLS | `pg_isready` |
| `redis` | `redis:7-alpine` | Cache + WS pubsub + arq queue | `redis-cli ping` |
| `minio` | `minio/minio` | Object storage S3-compatível | `/minio/health/live` |
| `pg-backup` | `postgres:16-alpine` | Cron de `pg_dump` diário (retenção 30d) | — |

## 3. Backend — camadas

```
router (api/v1)  →  schema (Pydantic v2)  →  service  →  repository  →  model (SQLAlchemy 2.0)
```

- **Routers**: validação de schema, dispatch ao service, montagem da resposta.
- **Schemas**: Pydantic In/Out por recurso, valida payload e formata resposta.
- **Services**: regras de negócio transacionais; orquestram repositories e disparam eventos (WS, jobs).
- **Repositories**: queries SQLAlchemy puras, sem regras.
- **Models**: declarações + relacionamentos.

### 3.1 Multi-tenancy via Postgres RLS

Cada request autenticada injeta no JWT: `user_id`, `tenant_id`, `role`. O middleware lê o cookie `friomac_access`, decodifica, busca o user e armazena em `request.state.user`. A dep `get_session` então abre uma `AsyncSession` e executa `SELECT set_config('app.tenant_id', :id, true)` (também `app.user_id`, `app.role`).

Toda tabela de negócio tem `tenant_id UUID NOT NULL` + policy RLS:

```sql
CREATE POLICY tenant_isolation ON <table>
  USING       (tenant_id::text = current_setting('app.tenant_id', true) OR current_setting('app.tenant_id', true) = '')
  WITH CHECK  (tenant_id::text = current_setting('app.tenant_id', true) OR current_setting('app.tenant_id', true) = '');
```

A app conecta com role `app_user` **sem** `BYPASSRLS` — bug no service não vaza entre tenants. Migrations rodam com `app_admin` (com bypass).

### 3.2 Auth (JWT + cookie HttpOnly)

- `POST /api/v1/auth/login` valida com Argon2id, emite **access (15min)** + **refresh (7d)**, cookies HttpOnly+Secure+SameSite=Lax.
- `POST /api/v1/auth/refresh` rotaciona o jti, persiste o token novo, revoga o anterior (anti-replay).
- `POST /api/v1/auth/logout` revoga refresh, limpa cookies.
- Lockout: **10 falhas em 30 min por email → 429**.

### 3.3 WebSocket realtime

- `wss:///ws` autenticado pelo cookie HttpOnly (4401 se inválido).
- `WsConnectionManager` em memória (single-instance). Para multi-worker, adicionar Redis pubsub: cada instância publica/assina canais `tenant:{id}`.
- Eventos tipados via Pydantic `WsEvent`: `lead.{created,updated,stage_moved,deleted,concluded}`, `notification.new`, `observacao.added`.
- `actorId` em todo evento; o cliente ignora se for o próprio user (atualização otimista já aplicou).

### 3.4 Storage de anexos (MinIO)

- Bucket `friomac-anexos` criado no startup do FastAPI (best-effort).
- Upload multipart no endpoint `/api/v1/anexos/lead/{id}` (limite 25MB).
- `storage_key` namespacado: `tenant/{tenant_id}/lead/{lead_id}/{anexo_id}/{filename}`.
- Download via `StreamingResponse` com `Content-Disposition: attachment`.

### 3.5 Workers (arq)

- `arq app.workers.arq_worker.WorkerSettings`.
- Cron `scan_sla` a cada 10 min: detecta leads com SLA próximo a estourar e cria notificações + dispara WS.
- `run_at_startup=True` para que o primeiro alerta saia logo após `make seed`.
- Dimensionamento: `max_jobs=5`, `job_timeout=300s`.

### 3.6 Integrações externas

Strategy pattern com fallback NoOp (se env vars não setadas, módulo loga e descarta):

- **Email** (`integrations/email/`): `SmtpSender` (asyncio.to_thread) ou `NoopSender`. SendGrid implementação fica para Sprint 7+.
- **WhatsApp Business** (`integrations/whatsapp/`): `MetaCloudClient` (Graph API v22.0) ou `NoopClient`.
- **ERP** (`integrations/erp/`): stub `NoopErpClient` aguardando spec real.

Webhook `/api/v1/webhooks/whatsapp` (GET verificação Meta + POST recebe mensagens).

## 4. Banco de dados — schema

| Tabela | Tenant? | RLS? | Notas |
|---|---|---|---|
| `tenants` | — | — | Raiz da hierarquia |
| `users` | ✓ | ✓ | Email único POR tenant |
| `auth_refresh_tokens` | — | — | Vinculado a `user_id` (que tem tenant) |
| `auth_login_attempts` | — | — | Histórico para lockout |
| `stages` | ✓ | ✓ | 8 estágios padrão por tenant (seedados) |
| `clientes` | ✓ | ✓ | Deduplicados por nome_fantasia |
| `representantes` | ✓ | ✓ | canal_proprio (3.5%) ou representante (5%) |
| `leads` | ✓ | ✓ | Soft-delete via `excluido_em` |
| `observacoes` | ✓ | ✓ | Histórico do lead (SISTEMA + MANUAL) |
| `anexos` | ✓ | ✓ | CHECK constraint: lead_id XOR representante_id |
| `orcamentos` | ✓ | ✓ | rascunho/enviado/aceito/recusado/expirado |
| `comissoes` | ✓ | ✓ | Criadas auto em GANHO se houver rep |
| `entregas` | ✓ | ✓ | UNIQUE em lead_id (1 entrega por lead) |
| `notificacoes` | ✓ | ✓ | Sino do header |

5 migrations Alembic aplicadas:
- `0001_initial_auth` (tenants, users, auth_*)
- `0002_rls_policies` (RLS em users)
- `0003_business_schema` (6 tabelas de negócio + RLS)
- `0004_extra_modules` (orçamentos, comissões, entregas + RLS)
- `0005_notificacoes` (sino + RLS)

## 5. Frontend — estrutura

```
src/
├─ api/             # clientes HTTP por recurso, validados com Zod
├─ hooks/queries/   # TanStack Query: useLeads, useStages, useKpis, useNotificacoes...
├─ hooks/           # useAuth, useLeadsRealtime, useNotificacoesRealtime
├─ store/           # Zustand: authStore, uiStore
├─ providers/       # QueryProvider + WebSocketProvider + Sonner
├─ routes/          # createBrowserRouter + RequireAuth + RoleGuard
├─ components/
│  ├─ ui/           # Dialog (Radix), Icon (Lucide), Spinner
│  └─ layout/       # AppShell, Sidebar, TopHeader, NotificationBell
├─ features/        # Dashboard, Kanban, Clientes, Vendedores, Orçamentos,
│                   # Comissões, Prazos, Config, Auth, Campanhas
├─ lib/             # http (fetch wrapper + refresh em 401), ws (singleton),
│                   # formatters BRL/datas, parsers
└─ styles/          # tokens.css + legacy.css (preservado integral) + a11y.css
```

### 5.1 Estado servidor

**TanStack Query v5** — cache + invalidação + optimistic updates.
- `useMoveLeadStage` faz optimistic update no Kanban DnD (rollback em erro).
- `useLeadsRealtime` aplica `setQueryData` direto quando WS dispara `lead.stage_moved` (zero flicker).

### 5.2 Estado cliente

**Zustand** — `authStore`, `uiStore`. Sem Redux, sem Context excessivo.

### 5.3 Realtime

`lib/ws.ts` é singleton: abre 1 conexão após login, reconnect exponencial (1s→2s→…→30s), heartbeat 25s. `WebSocketProvider` expõe `subscribe()` via Context.

### 5.4 Acessibilidade

- ESLint `jsx-a11y` strict no flat config.
- `:focus-visible` global em `a11y.css`.
- `@media (prefers-reduced-motion: reduce)` zera animações.
- Radix UI primitives (Dialog, Popover, Tabs) entregam ARIA + focus trap + ESC + portal.
- Skip link no AppShell.
- Testes axe-core via `@axe-core/playwright` em `e2e/smoke.spec.ts`.

## 6. Segurança em produção

- **HTTPS**: Caddy + Let's Encrypt (DNS-01 via Cloudflare configurável em `Caddyfile`).
- **Cabeçalhos**: HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options DENY, CSP estrita.
- **Cookies**: HttpOnly + Secure + SameSite=Lax. Refresh restrito a `/api/v1/auth`.
- **Senhas**: Argon2id (`time_cost=3`, `memory_cost=64MB`). Rehash transparente em login.
- **Rate limit**: 5 logins/5min por IP (slowapi configurável).
- **Lockout**: 10 falhas/30min por email.

## 7. Observabilidade

- `structlog` JSON em stdout (parseável por qualquer agregador — Loki/Datadog/CloudWatch).
- `RequestIdMiddleware` propaga `X-Request-Id` em todas as requests.
- Endpoints `/health` (liveness) e `/ready` (readiness — checa DB).
- Métricas Prometheus (Sprint 7+): `prometheus-fastapi-instrumentator` está nas deps mas comentado.
