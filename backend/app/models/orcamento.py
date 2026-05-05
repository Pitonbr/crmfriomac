"""Modelo Orçamento — proposta comercial (vinculada a um lead)."""

from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from sqlalchemy import ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class OrcamentoStatus(StrEnum):
    RASCUNHO = "rascunho"
    ENVIADO = "enviado"
    ACEITO = "aceito"
    RECUSADO = "recusado"
    EXPIRADO = "expirado"


class Orcamento(Base, UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin):
    __tablename__ = "orcamentos"
    __table_args__ = (Index("ix_orcamentos_lead", "lead_id"),)

    lead_id: Mapped[UUID] = mapped_column(
        ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
    )
    numero: Mapped[str] = mapped_column(String(40), nullable=False)
    versao: Mapped[int] = mapped_column(default=1, nullable=False)
    valor_total: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), default=Decimal("0"), nullable=False
    )
    status: Mapped[OrcamentoStatus] = mapped_column(
        String(20), nullable=False, default=OrcamentoStatus.RASCUNHO
    )
    data_envio: Mapped[datetime | None] = mapped_column(nullable=True)
    validade_ate: Mapped[date | None] = mapped_column(nullable=True)
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    criado_por: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
