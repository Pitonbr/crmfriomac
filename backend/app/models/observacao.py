"""Modelo Observacao — log de eventos/mensagens em um lead."""

from enum import StrEnum
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class ObservacaoTipo(StrEnum):
    MANUAL = "manual"
    SISTEMA = "sistema"
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    AUDITORIA = "auditoria"


class Observacao(Base, UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin):
    __tablename__ = "observacoes"
    __table_args__ = (Index("ix_observacoes_lead", "lead_id", "criado_em"),)

    lead_id: Mapped[UUID] = mapped_column(
        ForeignKey("leads.id", ondelete="CASCADE"), nullable=False
    )
    autor_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    autor_nome: Mapped[str] = mapped_column(String(200), nullable=False)
    texto: Mapped[str] = mapped_column(Text, nullable=False)
    tipo: Mapped[ObservacaoTipo] = mapped_column(String(20), nullable=False, default=ObservacaoTipo.MANUAL)
