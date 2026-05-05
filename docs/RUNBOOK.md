# Runbook

> 📝 **Sprint 6 vai expandir este documento.**

## Deploys

```bash
# No servidor da Friomac
git pull
docker compose pull
docker compose up -d --remove-orphans
docker compose run --rm backend alembic upgrade head
```

## Backup

Automático: cron interno do container `pg-backup` faz dump diário em `/backups` (volume `pg_backups`), retenção 30 dias.

Manual:

```bash
make backup
docker compose exec pg-backup ls -lh /backups
```

## Restore

```bash
# 1. Para a app (mas não o DB)
docker compose stop backend worker

# 2. Recria o database
docker compose exec db psql -U friomac -d postgres -c "DROP DATABASE friomac;"
docker compose exec db psql -U friomac -d postgres -c "CREATE DATABASE friomac;"

# 3. Restore (substitua o nome do arquivo)
docker compose exec db pg_restore -U friomac -d friomac \
    --no-owner --no-privileges --clean \
    /backups/friomac-YYYYMMDD-HHMMSS.dump

# 4. Sobe app
docker compose up -d backend worker
```

## Troubleshooting

### Container backend não fica `healthy`

- Ver logs: `docker compose logs -f backend`
- Verificar `.env` — JWT_SECRET, DATABASE_URL, MINIO_*
- Testar manualmente: `docker compose exec backend curl -f http://localhost:8000/ready`

### Frontend retorna 502 via Caddy

- `docker compose logs caddy frontend`
- Verificar se o build foi gerado: `docker compose exec frontend ls /usr/share/nginx/html`

### MinIO não cria bucket

Sprint 3 vai adicionar job de bootstrap. Por ora, criar manualmente via console em <http://localhost:9001>.

### "permission denied" em `pg-backup.sh`

`chmod +x infra/backup/pg-backup.sh` antes de subir o stack.
