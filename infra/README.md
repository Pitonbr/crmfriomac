# Infra

Configuração de containers auxiliares.

## Arquivos

- [`caddy/Caddyfile`](./caddy/Caddyfile) — Reverse proxy + TLS automático (Let's Encrypt em prod).
- [`postgres/init.sh`](./postgres/init.sh) — Roda na primeira subida do Postgres; cria extensões.
- [`backup/pg-backup.sh`](./backup/pg-backup.sh) — Dump diário com retenção 30 dias.

## TLS em produção

Editar `caddy/Caddyfile` descomentando o bloco `tls` apropriado (Cloudflare DNS-01 é o exemplo). Definir `CF_API_TOKEN` no `.env` do servidor.

## Restore (manual)

```bash
docker compose exec db psql -U friomac -d friomac -c "DROP DATABASE friomac;"
docker compose exec db psql -U friomac -d postgres -c "CREATE DATABASE friomac;"
docker compose exec db pg_restore -U friomac -d friomac --no-owner --no-privileges --clean /backups/friomac-YYYYMMDD-HHMMSS.dump
```
