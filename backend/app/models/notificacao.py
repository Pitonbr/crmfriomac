"""Modelo Notificacao — para o sino do header (in-app)."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class NotificacaoTipo(StrEnum):
    # Funil/leads → AMARELO
    SLA_ESTOURANDO  = "sla_estourando"
    SLA_ESTOURADO   = "sla_estourado"
    LEAD_GANHO      = "lead_ganho"
    LEAD_PERDIDO    = "lead_perdido"
    LEAD_MUDANCA    = "lead_mudanca"
    ENTREGA_PROXIMA = "entrega_proxima"
    # Mensagens de usuários → AZUL
    MENSAGEM        = "mensagem"
    COMISSAO_NOVA   = "comissao_nova"
    # Marketing/Campanhas → VERDE
    MARKETING       = "marketing"
    # Auditoria/Log → VERMELHO
    AUDITORIA       = "auditoria"
    SISTEMA         = "sistema"


class Notificacao(Base, UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin):
    __tablename__ = "notificacoes"
    __table_args__ = (
        Index("ix_notificacoes_user_lida", "user_id", "lida_em"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    tipo: Mapped[NotificacaoTipo] = mapped_column(String(40), nullable=False)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    mensagem: Mapped[str] = mapped_column(Text, nullable=False)
    link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    lida_em: Mapped[datetime | None] = mapped_column(nullable=True)
