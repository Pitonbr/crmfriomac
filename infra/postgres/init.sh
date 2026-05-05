#!/bin/sh
# ════════════════════════════════════════════════════════════════
#  Postgres — script de inicialização (1ª subida)
#  Cria extensões necessárias para multi-tenancy + busca textual.
#  Roda como POSTGRES_USER/POSTGRES_DB do compose.
# ════════════════════════════════════════════════════════════════

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Extensões obrigatórias
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    CREATE EXTENSION IF NOT EXISTS "btree_gin";

    -- Sprint 2: roles app_admin (BYPASSRLS, usado por Alembic) e app_user (sem bypass)
    -- serão criadas via migration Alembic (00_setup_roles.py).
EOSQL

echo "[init.sh] Extensions criadas em $POSTGRES_DB"
