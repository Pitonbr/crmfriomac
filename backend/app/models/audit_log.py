"""AuditLog — registro imutável de ações críticas no sistema."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, UUIDPrimaryKeyMixin, utcnow


class AuditLog(Base, UUIDPrimaryKeyMixin, TenantMixin):
    """Cada linha representa uma ação auditável (criação, alteração, exclusão).

    Nunca é atualizado ou excluído — append-only.
    """

    __tablename__ = "audit_log"
    __table_args__ = (
        Index("ix_audit_log_tenant_criado", "tenant_id", "criado_em"),
        Index("ix_audit_log_user_id", "user_id"),
    )

    # Quem fez
    user_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
    user_nome: Mapped[str] = mapped_column(String(200), nullable=False)
    user_role: Mapped[str] = mapped_column(String(40), nullable=False)

    # O que fez
    acao: Mapped[str] = mapped_column(String(40), nullable=False)   # create | update | delete | login
    entidade: Mapped[str] = mapped_column(String(80), nullable=False)  # lead | user | representante | …
    entidade_id: Mapped[str | None] = mapped_column(String(40), nullable=True)  # UUID como string
    descricao: Mapped[str] = mapped_column(Text, nullable=False)

    # Quando
    criado_em: Mapped[datetime] = mapped_column(default=utcnow, nullable=False)
