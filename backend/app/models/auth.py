"""Tabelas auxiliares de autenticação."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AuthRefreshToken(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Lista de refresh tokens emitidos (revogação por logout/rotação).

    `jti` é o ID único do JWT — comparamos contra esta tabela em /refresh.
    Não tem `tenant_id` por simplicidade (vinculado a user_id que tem).
    """

    __tablename__ = "auth_refresh_tokens"
    __table_args__ = (Index("ix_auth_refresh_tokens_jti", "jti", unique=True),)

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    jti: Mapped[str] = mapped_column(String(64), nullable=False)
    expira_em: Mapped[datetime] = mapped_column(nullable=False)
    revogado_em: Mapped[datetime | None] = mapped_column(nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)


class AuthLoginAttempt(Base, UUIDPrimaryKeyMixin):
    """Histórico de tentativas de login para rate-limiting/lockout.

    Não tem `tenant_id` propositalmente — o ataque é contra o email,
    independente de tenant. Lockout aplica POR email + IP.
    """

    __tablename__ = "auth_login_attempts"
    __table_args__ = (
        Index("ix_auth_login_attempts_email_criado", "email", "criado_em"),
        Index("ix_auth_login_attempts_ip_criado", "ip", "criado_em"),
    )

    email: Mapped[str] = mapped_column(String(254), nullable=False)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    sucesso: Mapped[bool] = mapped_column(Boolean, nullable=False)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(nullable=False)
