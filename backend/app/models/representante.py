"""Modelo Representante — vendedor (canal próprio) ou rep externo."""

from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from sqlalchemy import ForeignKey, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class CanalRepresentante(StrEnum):
    CANAL_PROPRIO = "canal_proprio"
    REPRESENTANTE = "representante"


class Representante(Base, UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin):
    __tablename__ = "representantes"
    __table_args__ = (Index("ix_representantes_tenant_nome", "tenant_id", "nome"),)

    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    canal: Mapped[CanalRepresentante] = mapped_column(String(20), nullable=False)
    comissao_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0"), nullable=False)
    cidade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    estado: Mapped[str | None] = mapped_column(String(2), nullable=True)
    email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    telefone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    ativo: Mapped[bool] = mapped_column(default=True, nullable=False)
