"""Modelo Comissão — calculada quando lead é GANHO (canal_proprio 3.5%, rep 5%)."""

from datetime import date
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from sqlalchemy import ForeignKey, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class ComissaoStatus(StrEnum):
    PENDENTE = "pendente"
    APROVADA = "aprovada"
    PAGA = "paga"
    CANCELADA = "cancelada"


class Comissao(Base, UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin):
    __tablename__ = "comissoes"
    __table_args__ = (
        Index("ix_comissoes_rep_status", "representante_id", "status"),
        Index("ix_comissoes_lead", "lead_id"),
    )

    representante_id: Mapped[UUID] = mapped_column(
        ForeignKey("representantes.id", ondelete="RESTRICT"), nullable=False
    )
    lead_id: Mapped[UUID] = mapped_column(
        ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
    )
    orcamento_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("orcamentos.id", ondelete="SET NULL"), nullable=True
    )
    valor_base: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0"), nullable=False
    )
    percentual: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("0"), nullable=False
    )
    valor_comissao: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0"), nullable=False
    )
    status: Mapped[ComissaoStatus] = mapped_column(
        String(20), nullable=False, default=ComissaoStatus.PENDENTE
    )
    comprovante_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("anexos.id", ondelete="SET NULL"), nullable=True
    )
    data_pagamento: Mapped[date | None] = mapped_column(nullable=True)
