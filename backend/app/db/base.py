"""Declarative base e mixins comuns."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import DateTime, MetaData
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
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
    type_annotation_map: dict[Any, Any] = {
        UUID: PG_UUID(as_uuid=True),
        # Mapear todos os datetime para TIMESTAMPTZ (compatível com tzinfo=UTC)
        datetime: DateTime(timezone=True),
    }


def utcnow() -> datetime:
    return datetime.now(UTC)


class TimestampMixin:
    criado_em: Mapped[datetime] = mapped_column(default=utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(
        default=utcnow, onupdate=utcnow, nullable=False
    )


class UUIDPrimaryKeyMixin:
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)


class TenantMixin:
    """tenant_id NOT NULL — isola via RLS no Postgres."""

    tenant_id: Mapped[UUID] = mapped_column(nullable=False, index=True)


class SoftDeleteMixin:
    """Soft-delete: queries normais filtram excluido_em IS NULL."""

    excluido_em: Mapped[datetime | None] = mapped_column(nullable=True, index=True)

    @property
    def excluido(self) -> bool:
        return self.excluido_em is not None
