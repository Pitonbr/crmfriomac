"""Modelo Lead — oportunidade comercial."""

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from sqlalchemy import ForeignKey, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, SoftDeleteMixin, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class LeadPrioridade(StrEnum):
    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"


class LeadStatus(StrEnum):
    EM_ABERTO = "em_aberto"
    GANHO = "ganho"
    PERDIDO = "perdido"
    EM_PRODUCAO = "em_producao"


class Lead(Base, UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "leads"
    __table_args__ = (
        Index("ix_leads_tenant_stage", "tenant_id", "stage_id"),
        Index("ix_leads_tenant_status", "tenant_id", "status"),
        Index("ix_leads_codigo", "tenant_id", "codigo"),
    )

    codigo: Mapped[str] = mapped_column(String(40), nullable=False)
    codigo_legado: Mapped[str | None] = mapped_column(String(40), nullable=True)

    cliente_id: Mapped[UUID] = mapped_column(
        ForeignKey("clientes.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    representante_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("representantes.id", ondelete="SET NULL"), nullable=True, index=True
    )
    stage_id: Mapped[UUID] = mapped_column(
        ForeignKey("stages.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    criado_por: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    projeto: Mapped[str | None] = mapped_column(String(80), nullable=True)
    valor: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"), nullable=False)
    prioridade: Mapped[LeadPrioridade] = mapped_column(String(10), nullable=False, default=LeadPrioridade.MEDIA)
    status: Mapped[LeadStatus] = mapped_column(String(20), nullable=False, default=LeadStatus.EM_ABERTO)
    motivo_perda: Mapped[str | None] = mapped_column(String(500), nullable=True)

    data_abertura: Mapped[datetime] = mapped_column(nullable=False)
    data_ultima_movimentacao: Mapped[datetime] = mapped_column(nullable=False)
    sla_deadline: Mapped[datetime | None] = mapped_column(nullable=True)

    tags: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    metadados: Mapped[dict[str, object]] = mapped_column(JSONB, default=dict, nullable=False)

    ganho_em: Mapped[datetime | None] = mapped_column(nullable=True)
    perdido_em: Mapped[datetime | None] = mapped_column(nullable=True)
