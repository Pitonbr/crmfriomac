"""Modelo Representante — vendedor (canal próprio) ou rep externo."""

from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from sqlalchemy import ForeignKey, Index, Numeric, String, Text
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

    # ── Identificação ────────────────────────────────────────────
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    nome_fantasia: Mapped[str | None] = mapped_column(String(200), nullable=True)
    razao_social: Mapped[str | None] = mapped_column(String(200), nullable=True)
    cnpj: Mapped[str | None] = mapped_column(String(20), nullable=True)
    canal: Mapped[CanalRepresentante] = mapped_column(String(20), nullable=False)
    comissao_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0"), nullable=False)

    # ── Contato ──────────────────────────────────────────────────
    email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    telefone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    endereco: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cep: Mapped[str | None] = mapped_column(String(10), nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    estado: Mapped[str | None] = mapped_column(String(2), nullable=True)

    # ── Financeiro ───────────────────────────────────────────────
    banco: Mapped[str | None] = mapped_column(String(100), nullable=True)
    agencia: Mapped[str | None] = mapped_column(String(20), nullable=True)
    conta: Mapped[str | None] = mapped_column(String(30), nullable=True)
    pix: Mapped[str | None] = mapped_column(String(100), nullable=True)
    obs_financeiro: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Redes Sociais ────────────────────────────────────────────
    instagram: Mapped[str | None] = mapped_column(String(100), nullable=True)
    linkedin: Mapped[str | None] = mapped_column(String(200), nullable=True)
    tiktok: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website: Mapped[str | None] = mapped_column(String(200), nullable=True)
    outras_redes: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # ── Status ───────────────────────────────────────────────────
    ativo: Mapped[bool] = mapped_column(default=True, nullable=False)
