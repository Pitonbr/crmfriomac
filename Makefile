# ════════════════════════════════════════════════════════════════
#  Friomac CRM — Makefile
#  Atalhos para o stack Docker Compose. Funciona em Linux/macOS.
#  No Windows, usar Git Bash, WSL, ou rodar os comandos `docker compose` diretamente.
# ════════════════════════════════════════════════════════════════

DC      := docker compose
DC_DEV  := docker compose -f docker-compose.yml -f docker-compose.dev.yml

.PHONY: help dev up down restart logs ps build pull shell-backend shell-frontend \
        migrate revision seed test test-backend test-frontend test-e2e \
        lint format clean nuke backup

help:                       ## Mostra esta ajuda
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ── Dev ─────────────────────────────────────────────────────────
dev:                        ## Sobe o stack em modo desenvolvimento (hot reload)
	$(DC_DEV) up --build

dev-bg:                     ## Sobe dev em background
	$(DC_DEV) up -d --build

# ── Lifecycle (produção/local) ──────────────────────────────────
up:                         ## Sobe o stack em background
	$(DC) up -d

down:                       ## Para e remove containers (mantém volumes)
	$(DC) down

restart:                    ## Reinicia o stack
	$(DC) restart

logs:                       ## Tail dos logs (Ctrl+C para sair)
	$(DC) logs -f --tail=100

ps:                         ## Lista containers do stack
	$(DC) ps

build:                      ## Rebuilda todas as imagens
	$(DC) build

pull:                       ## Puxa imagens atualizadas
	$(DC) pull

# ── Shells ──────────────────────────────────────────────────────
shell-backend:              ## Abre shell no container backend
	$(DC) exec backend bash

shell-frontend:             ## Abre shell no container frontend
	$(DC_DEV) exec frontend sh

shell-db:                   ## psql no banco
	$(DC) exec db psql -U $${POSTGRES_USER:-friomac} -d $${POSTGRES_DB:-friomac}

# ── Banco e seed ────────────────────────────────────────────────
migrate:                    ## Aplica migrations (alembic upgrade head)
	$(DC_DEV) run --rm backend alembic upgrade head

revision:                   ## Cria nova revisão Alembic. Uso: make revision m="descrição"
	$(DC_DEV) run --rm backend alembic revision --autogenerate -m "$(m)"

seed:                       ## Popula tenant + dados legados
	$(DC_DEV) run --rm backend python -m scripts.seed_from_legacy

# ── Testes ──────────────────────────────────────────────────────
test: test-backend test-frontend  ## Roda todos os testes

test-backend:               ## Pytest no backend
	$(DC) run --rm backend pytest -v --cov=app --cov-report=term-missing

test-frontend:              ## Vitest no frontend
	$(DC_DEV) run --rm frontend pnpm test --run

test-e2e:                   ## Playwright (precisa stack rodando)
	$(DC_DEV) run --rm frontend pnpm test:e2e

# ── Qualidade ───────────────────────────────────────────────────
lint:                       ## Lint backend (ruff+mypy) e frontend (eslint+tsc)
	$(DC) run --rm backend ruff check .
	$(DC) run --rm backend mypy app
	$(DC_DEV) run --rm frontend pnpm lint
	$(DC_DEV) run --rm frontend pnpm typecheck

format:                     ## Formata código (ruff format + prettier)
	$(DC) run --rm backend ruff format .
	$(DC_DEV) run --rm frontend pnpm format

# ── Backup / restore ────────────────────────────────────────────
backup:                     ## Dump manual do banco
	$(DC) exec pg-backup /usr/local/bin/pg-backup.sh

# ── Limpeza ─────────────────────────────────────────────────────
clean:                      ## Remove containers parados e cache de build
	$(DC) down --remove-orphans
	docker system prune -f

nuke:                       ## ⚠️  Apaga TUDO (containers + volumes + imagens) — pede confirmação
	@echo "Isto vai DELETAR todos os volumes (BANCO, MinIO, backups). Pressione Ctrl+C para cancelar..."
	@sleep 5
	$(DC) down -v --remove-orphans
	docker system prune -af
