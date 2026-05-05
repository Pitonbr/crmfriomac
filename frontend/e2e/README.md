# Testes E2E (Playwright)

## Executar

Pré-requisito: stack `make dev` rodando + `make migrate` + `make seed`.

```bash
cd frontend
SMOKE_PASSWORD='<senha do admin gerada pelo seed>' pnpm test:e2e
```

Ou em modo UI interativo:

```bash
SMOKE_PASSWORD='<senha>' pnpm test:e2e:ui
```

## CI

No CI (`.github/workflows/ci.yml`), o E2E é opt-in (precisa subir o stack inteiro).
Para o MVP, deixamos o smoke como comando manual; quando o deploy automatizado existir,
adicionar job `e2e` na pipeline com docker compose.

## Cobertura atual

- Login (admin) → redireciona /dashboard.
- Sidebar → Kanban abre com colunas do funil.
- axe-core verifica violações críticas/sérias em /login e /dashboard.
