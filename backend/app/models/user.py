"""Modelo User — funcionário do tenant."""

from enum import StrEnum

from sqlalchemy import Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class UserRole(StrEnum):
    MASTER           = "master"
    ADM_COMERCIAL    = "adm_comercial"
    ADM_MARKETING    = "adm_marketing"
    ADM_OPERACIONAL  = "adm_operacional"
    REPRESENTANTE    = "representante"
    VENDEDOR         = "vendedor"   # mantido por compatibilidade → converte para representante


class User(Base, UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin):
    """Usuário humano que faz login no sistema.

    Email é único POR tenant (mesma pessoa pode estar em tenants diferentes
    com o mesmo email — cenário multi-empresa).
    """

    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
        Index("ix_users_email", "email"),
    )

    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    telefone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(String(20), nullable=False)
    avatar: Mapped[str | None] = mapped_column(String(8), nullable=True)
    grupo: Mapped[str | None] = mapped_column(String(80), nullable=True)
    ativo: Mapped[bool] = mapped_column(default=True, nullable=False)
    # Quando true, frontend força redirect para /change-password antes de outra tela
    senha_provisoria: Mapped[bool] = mapped_column(default=False, nullable=False)

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"
