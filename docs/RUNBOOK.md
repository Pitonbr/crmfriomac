# Runbook — Friomac CRM

Operações rotineiras e procedimentos de incidente.

## Setup inicial em servidor de produção

```bash
# Pré-requisitos
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin git

# Clonar repo
git clone https://github.com/Pitonbr/crmfriomac.git /srv/friomac-crm
cd /srv/friomac-crm
git checkout main  # após merge de refactor/v2

# Configurar segredos
cp .env.example .env
# Editar .env e setar:
#   POSTGRES_PASSWORD, MINIO_ROOT_PASSWORD (gerar 32+ chars random)
#   JWT_SECRET=$(openssl rand -hex 32)
#   COOKIE_DOMAIN=crm.friomac.local
#   COOKIE_SECURE=true
#   APP_ENV=production
#   DOMAIN=crm.friomac.local
#   CF_API_TOKEN=<para Let's Encrypt DNS-01> (opcional)

# Subir stack
docker compose up -d
docker compose run --rm backend alembic upgrade head
docker compose run --rm backend python -m scripts.seed_from_legacy
# ANOTAR as senhas geradas — não aparecem novamente
```

## Deploys (CI gera imagem em GHCR)

```bash
git pull origin main
docker compose pull
docker compose up -d --remove-orphans
docker compose run --rm backend alembic upgrade head
```

## Backup

### Automático

Container `pg-backup` faz `pg_dump --format=custom --compress=9` diário (cron interno via `sleep 86400`), retenção 30 dias, em volume `pg_backups`.

### Manual

```bash
docker compose exec pg-backup /usr/local/bin/pg-backup.sh
docker compose exec pg-backup ls -lh /backups
```

### Cópia para off-site

```bash
docker run --rm -v crmfriomac_pg_backups:/source:ro -v "$(pwd)/local-backups":/dest alpine \
  cp -r /source/. /dest/
# ou com rclone para S3/GCS/etc — não é parte do compose default
```

## Restore

### Restore total (substitui banco existente)

```bash
# 1. Para a app (mantém DB rodando)
docker compose stop backend worker

# 2. Recria database
docker compose exec db psql -U friomac -d postgres -c "DROP DATABASE friomac;"
docker compose exec db psql -U friomac -d postgres -c "CREATE DATABASE friomac;"

# 3. Restore
docker compose exec db pg_restore -U friomac -d friomac \
  --no-owner --no-privileges --clean \
  /backups/friomac-YYYYMMDD-HHMMSS.dump

# 4. Sobe app de volta
docker compose up -d backend worker
```

### Restore de teste (DB temporário, sem afetar prod)

```bash
docker compose exec db createdb -U friomac friomac_restore_test
docker compose exec pg-backup sh -c '
  PGPASSWORD=$POSTGRES_PASSWORD pg_restore -h db -U friomac \
    -d friomac_restore_test --no-owner --no-privileges \
    /backups/friomac-YYYYMMDD-HHMMSS.dump'
docker compose exec db psql -U friomac -d friomac_restore_test \
  -c "SELECT count(*) FROM users; SELECT count(*) FROM leads;"
docker compose exec db dropdb -U friomac friomac_restore_test
```

**Validado em 2026-05-05**: 5 users, 62 leads, 56 clientes, 8 stages restaurados sem erro num DB temporário a partir de um dump de 71KB.

## Troubleshooting

### `make dev` falha com "port already allocated"

Conflito com serviço local (Postgres, Redis, Vite, etc). Em dev, mapeamentos atuais:
- Postgres: `5433:5432`
- Redis: sem porta exposta
- MinIO: `9100:9000`, `9101:9001`
- Backend: `8001:8000`
- Frontend: `5174:5173`

Se ainda assim conflitar, ajustar `docker-compose.dev.yml` ou parar serviço local (`sudo systemctl stop postgresql` etc).

### Backend retorna 500 em login

```bash
docker compose logs backend --tail 100 | grep -A 5 ERROR
```
Causas comuns: JWT_SECRET vazio/curto, DATABASE_URL errada, schema não migrou (`alembic upgrade head`).

### Worker não aparece criar notificações

```bash
docker compose logs worker --tail 50
```
Espera-se `cron:scan_sla` rodando a cada 10min. Se não:
- Redis healthy?
- `arq_worker.py` carrega? Erro de import quebra tudo silenciosamente.

### Frontend retorna 502 via Caddy

```bash
docker compose logs caddy frontend
docker compose exec frontend ls /usr/share/nginx/html
```
Se `dist/` vazio, rebuild: `docker compose build --no-cache frontend`.

### Cookies não persistem (login some)

- Em prod, `COOKIE_SECURE=true` e domínio bate com `COOKIE_DOMAIN`.
- Em dev (HTTP), `COOKIE_SECURE=false`.
- Browser recusa cookie cross-site sem HTTPS.

### MinIO não cria bucket no startup

```bash
docker compose logs backend | grep minio
```
Bucket é criado em `lifespan` do FastAPI. Se MinIO subir depois do backend, log diz `bootstrap_failed`. Solução: `docker compose restart backend` após MinIO healthy.

## Rotação de segredos

### JWT secret

```bash
NEW=$(openssl rand -hex 32)
# Editar .env, trocar JWT_SECRET=$NEW
docker compose up -d --force-recreate backend worker
# Todos os usuários precisam fazer login de novo (tokens antigos inválidos)
```

### Senhas de DB / MinIO

Mais complexo — exige rebuild do volume. Documentação separada em incidente.

### Senha de admin (no banco)

```bash
docker compose exec backend python -c "
from app.security.passwords import hash_password
print(hash_password('NOVA_SENHA_AQUI'))
"
# UPDATE users SET senha_hash='<hash>' WHERE email='admin@friomac.ind.br';
```

## Monitoramento manual

```bash
docker compose ps                       # status containers
docker compose logs -f --tail 100       # logs em tempo real
docker compose exec db psql -U friomac -d friomac \
  -c "SELECT count(*) FROM leads, count(*) FROM notificacoes;"
curl -s http://localhost:8001/ready | jq
```

## Limpar tudo (DEV — apaga dados!)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
# Ou via Makefile:
make nuke   # com 5s de confirmação
```
