"""Modelo Entrega — prazo e acompanhamento da produção/entrega de um lead ganho."""

from datetime import date
from enum import StrEnum
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class EntregaStatus(StrEnum):
    PLANEJADA = "planejada"
    EM_PRODUCAO = "em_producao"
    ENTREGUE = "entregue"
    ATRASADA = "atrasada"


class Entrega(Base, UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin):
    __tablename__ = "entregas"
    __table_args__ = (Index("ix_entregas_status_prazo", "status", "prazo_estimado"),)

    lead_id: Mapped[UUID] = mapped_column(
        ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    prazo_estimado: Mapped[date | None] = mapped_column(nullable=True)
    prazo_real: Mapped[date | None] = mapped_column(nullable=True)
    status: Mapped[EntregaStatus] = mapped_column(
        String(20), nullable=False, default=EntregaStatus.PLANEJADA
    )
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
