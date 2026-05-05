"""Modelo Stage — etapa do funil de vendas (configurável por tenant)."""

from sqlalchemy import Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Stage(Base, UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin):
    __tablename__ = "stages"
    __table_args__ = (
        UniqueConstraint("tenant_id", "slug", name="uq_stages_tenant_slug"),
        Index("ix_stages_tenant_ordem", "tenant_id", "ordem"),
    )

    slug: Mapped[str] = mapped_column(String(40), nullable=False)
    label: Mapped[str] = mapped_column(String(80), nullable=False)
    icone: Mapped[str | None] = mapped_column(String(10), nullable=True)
    sla_horas: Mapped[int] = mapped_column(default=0, nullable=False)
    cor: Mapped[str] = mapped_column(String(20), nullable=False)
    prob_pct: Mapped[int] = mapped_column(default=0, nullable=False)
    ordem: Mapped[int] = mapped_column(default=0, nullable=False)
    ativo: Mapped[bool] = mapped_column(default=True, nullable=False)
