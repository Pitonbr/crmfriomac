# Legacy — Friomac CRM v1 (vanilla JS)

Esta pasta preserva a versão original do Friomac CRM (HTML + CSS + JS vanilla) como **referência** durante a refatoração para a v2 (FastAPI + React + PostgreSQL + Docker, em [`../`](../)).

## Conteúdo

- `index.html` — entrypoint da SPA (login + 9 telas + 2 modais).
- `css/styles.css` — design system completo (tokens, paleta industrial, microinterações). **Será migrado integralmente** para `frontend/src/styles/legacy.css` na v2 — preservar não significa reescrever.
- `js/app.js` — lógica de UI (~3300 linhas, padrão IIFE `App`).
- `js/data.js` — store em memória + persistência localStorage (~720 linhas, padrão IIFE `FriomacData`). **Fonte do `scripts/seed_from_legacy.py`** — alimenta o seed inicial do PostgreSQL.

## Por que está aqui

1. **Referência de UX**: validar que cada tela do React mantém o mesmo fluxo.
2. **Referência de design**: cores, espaçamentos, animações continuam as mesmas — o CSS é importado integral na v2.
3. **Fonte de dados**: 65 leads, 15 representantes, 5 usuários e KPIs reais que serão migrados.
4. **Histórico**: continua acessível para arqueologia, comparação e debugging.

## NÃO usar em produção

- Senhas em texto puro (`admin123`, `123456`) — vide [`../docs/SECURITY.md`](../docs/SECURITY.md).
- XSS via `innerHTML` em ~30 pontos.
- Modais sem ARIA / focus trap.
- Persistência só em `localStorage`.

A versão de produção é a v2 — esta pasta é apenas histórica.

## Como rodar (apenas para inspeção visual)

Abrir `legacy/index.html` direto no navegador. Login: `admin@friomac.ind.br` / `admin123`.
