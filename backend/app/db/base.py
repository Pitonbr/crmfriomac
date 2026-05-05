"""Declarative base e mixins comuns.

Convenções de nomenclatura aplicadas a TODOS os índices/constraints
para Alembic detectar mudanças corretamente.
"""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import MetaData
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Base declarative com metadata + naming convention configurados."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)

    type_annotation_map: dict[Any, Any] = {
        UUID: PG_UUID(as_uuid=True),
    }


def utcnow() -> datetime:
    return datetime.now(UTC)


class TimestampMixin:
    """Adiciona criado_em/atualizado_em automáticos."""

    criado_em: Mapped[datetime] = mapped_column(default=utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(
        default=utcnow, onupdate=utcnow, nullable=False
    )


class UUIDPrimaryKeyMixin:
    """PK em UUIDv4 gerado no app (evita round-trip ao DB)."""

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)


class TenantMixin:
    """Adiciona tenant_id NOT NULL para isolamento RLS.

    Usar em TODA tabela de negócio (não em `tenants` nem `auth_login_attempts`).
    """

    tenant_id: Mapped[UUID] = mapped_column(nullable=False, index=True)
