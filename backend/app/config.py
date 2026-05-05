"""Configurações da aplicação carregadas de variáveis de ambiente.

Usa pydantic-settings para validação. Em dev, lê `.env` na raiz do repo
(via env_file). Em prod (Docker), as vars vêm do `env_file: .env` no compose.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field, PostgresDsn, RedisDsn, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuração tipada do app. Falha rápido se algo essencial faltar."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────────────
    app_env: Literal["dev", "test", "production"] = "dev"
    log_level: Literal["debug", "info", "warning", "error"] = "info"

    # ── DB ───────────────────────────────────────────────────────
    database_url: PostgresDsn

    # ── Redis ────────────────────────────────────────────────────
    redis_url: RedisDsn

    # ── MinIO ────────────────────────────────────────────────────
    minio_endpoint: str
    minio_root_user: str
    minio_root_password: SecretStr
    minio_bucket: str = "friomac-anexos"
    minio_use_ssl: bool = False

    # ── Auth ─────────────────────────────────────────────────────
    jwt_secret: SecretStr
    jwt_access_ttl: int = Field(default=900, ge=60)
    jwt_refresh_ttl: int = Field(default=604800, ge=3600)
    cookie_domain: str = "localhost"
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    # ── Tenant ───────────────────────────────────────────────────
    tenant_default_slug: str = "friomac"

    # ── Email (Sprint 5) ─────────────────────────────────────────
    email_backend: Literal["smtp", "sendgrid"] = "smtp"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: SecretStr = SecretStr("")
    smtp_from: str = "noreply@friomac.ind.br"
    sendgrid_api_key: SecretStr = SecretStr("")

    # ── WhatsApp (Sprint 5) ──────────────────────────────────────
    whatsapp_token: SecretStr = SecretStr("")
    whatsapp_phone_id: str = ""
    whatsapp_verify_token: SecretStr = SecretStr("")

    # ── ERP (Sprint 5) ───────────────────────────────────────────
    erp_base_url: str = ""
    erp_api_key: SecretStr = SecretStr("")

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    """Singleton para reaproveitar instância (evita re-parsear env)."""
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
