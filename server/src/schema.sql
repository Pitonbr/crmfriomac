-- Armazena todas as coleções de dados do CRM (leads, users, reps, etc.)
-- como linhas JSONB, uma tabela genérica por "recurso" para espelhar
-- 1:1 as coleções já existentes em js/data.js sem exigir normalização
-- relacional nesta primeira versão.
CREATE TABLE IF NOT EXISTS store (
  resource    TEXT NOT NULL,
  id          TEXT NOT NULL,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (resource, id)
);

CREATE INDEX IF NOT EXISTS store_resource_idx ON store (resource);

-- Configurações simples de app (ex: timeout de sessão), chave/valor.
CREATE TABLE IF NOT EXISTS app_config (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- Metadados de arquivos enviados (anexos de lead/rep/mkt/comissão).
CREATE TABLE IF NOT EXISTS uploads (
  id          TEXT PRIMARY KEY,
  filename    TEXT NOT NULL,
  original_name TEXT,
  mime_type   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
