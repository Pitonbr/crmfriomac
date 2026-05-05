# Friomac CRM — Frontend

React 18 + Vite + TypeScript (strict).

## Estrutura (alvo Sprint 2+)

Ver plano em `~/.claude/plans/twinkling-chasing-ember.md`, seção 7.

## Sprint 1 atual

Apenas o esqueleto está pronto:

- Vite + TS strict configurado
- ESLint flat config + Prettier
- Vitest + Testing Library + Playwright
- Estilos legados (`legacy.css`) preservados integralmente
- Tokens extraídos em `tokens.css`
- `a11y.css` resolve focus-visible global e prefers-reduced-motion
- Tela de boas-vindas (`welcome.css`) só para confirmar que tudo subiu

Sprint 2 adiciona: React Router, TanStack Query, providers, AppShell, login.

## Comandos

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build
pnpm test
pnpm test:e2e
pnpm lint
pnpm typecheck
```
