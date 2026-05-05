#!/bin/sh
# ════════════════════════════════════════════════════════════════
#  pg_dump diário, compressão gz, retenção 30 dias.
#  Roda em loop infinito no container pg-backup.
# ════════════════════════════════════════════════════════════════

set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DB_HOST="${DB_HOST:-db}"
DB_USER="${POSTGRES_USER:-friomac}"
DB_NAME="${POSTGRES_DB:-friomac}"

mkdir -p "$BACKUP_DIR"

TS=$(date -u +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/friomac-${TS}.dump"

echo "[pg-backup] Iniciando dump em ${OUT}"

PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    --host="$DB_HOST" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-privileges \
    --file="$OUT"

echo "[pg-backup] Dump concluído: $(du -h "$OUT" | cut -f1)"

# Limpa backups mais antigos que RETENTION_DAYS
DELETED=$(find "$BACKUP_DIR" -type f -name "friomac-*.dump" -mtime "+$RETENTION_DAYS" -print -delete | wc -l)
echo "[pg-backup] Removidos $DELETED dumps antigos (>${RETENTION_DAYS}d)"
