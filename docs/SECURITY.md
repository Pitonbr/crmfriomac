# Segurança — Friomac CRM

## Sumário Executivo

A versão v1 (vanilla JS, pasta [`../legacy/`](../legacy/)) tem fragilidades conhecidas que estão sendo resolvidas pela versão v2 (FastAPI + React + PostgreSQL). Este documento registra o **estado atual** e o **plano de mitigação**.

O repositório `Pitonbr/crmfriomac` **é privado** — a exposição é restrita aos colaboradores GitHub do projeto. **Não houve vazamento público** identificado.

## Achados na v1 (auditoria 2026-05-02)

### Críticos (resolvidos na v2)

| # | Achado | Resolução na v2 |
|---|---|---|
| 1 | Senhas em texto puro em `legacy/js/data.js:9-15` (5 contas) | Backend FastAPI valida com **Argon2id**; senhas geradas no seed e comunicadas via canal seguro. |
| 2 | PII de clientes versionada (nomes, emails, telefones, valores em `legacy/js/data.js:50-111`) | Dados saem do código; vão para PostgreSQL. Repo conterá apenas fixtures sintéticas. |
| 3 | XSS armazenado em ~30 pontos via `innerHTML` | Migração para React: JSX escapa por padrão; ESLint `react/no-danger` bloqueia regressão. |
| 4 | Autenticação puramente client-side (DevTools expõe credenciais) | JWT em cookie **HttpOnly+Secure+SameSite=Lax**, refresh com rotação, rate limit, lockout. |
| 5 | Controle de acesso decorativo (papel é só ocultação visual) | **Postgres RLS** (`tenant_isolation` + `vendedor_scope`) + `require_role` nas rotas + `usePermissions()` no front. |
| 6 | Modais sem ARIA / focus trap / Esc | Radix UI primitives no React. |
| 7 | Sem CSP / HSTS / X-Frame-Options | Caddy injeta cabeçalhos completos. |
| 8 | Anexos em `localStorage` base64 | Upload multipart → **MinIO** (S3-compat) com chaves no banco. |

Detalhamento completo em `~/.claude/plans/twinkling-chasing-ember.md`, seção 9 (mapping 1:1 dos 20 críticos).

## Recomendações imediatas (até v2 subir)

1. **Não reusar as senhas demo** (`admin123`, `123456`) em nenhum outro sistema corporativo ou pessoal.
2. **Não compartilhar o repositório com terceiros** sem revisão.
3. **Restringir acesso de colaboração** ao mínimo necessário enquanto a v1 estiver acessível.

## LGPD

Os dados pessoais hoje em `legacy/js/data.js` (clientes, representantes) configuram tratamento de dado pessoal sob a LGPD. **Não se trata de incidente de segurança** (Art. 48) porque o repositório é privado e o acesso é controlado. Mesmo assim:

- Implementaremos na v2 o **direito de acesso, retificação e eliminação** (endpoints REST + UI em `/config`).
- Logs de **auditoria** (tabela `auditoria`) registrarão todo acesso/modificação a dado pessoal.
- O **DPO da Friomac** (definir) deve aprovar o seed inicial antes que dados reais sejam migrados.

## Plano de migração (v1 → v2) sob ótica de segurança

| Sprint | Marco de segurança |
|---|---|
| 0 | Documentação (este arquivo). |
| 1 | Esqueleto monorepo, `.gitignore` ampliado (impede `.env`, dumps, logs). |
| 2 | Auth backend completa (Argon2 + cookies HttpOnly + RLS + rate limit + lockout). |
| 3 | Migração dos dados via `scripts/seed_from_legacy.py` (gera senhas novas; dados reais vão para o banco). |
| 4 | Painel `/admin` (SQLAdmin) restrito a role `master` com auditoria. |
| 5 | Integrações com webhooks assinados (WhatsApp Meta, ERP). |
| 6 | Caddy + Let's Encrypt, headers HTTP, backup verificado, `axe-core` + `dependency-check`. |

## Contatos

- **Owner técnico do repo**: Pitonbr
- **Refatoração v2**: AleMunoz
- **DPO Friomac**: a definir
