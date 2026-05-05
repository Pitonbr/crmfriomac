"""Modelo Cliente — empresa/pessoa que compra ou pode comprar."""

from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Cliente(Base, UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin):
    __tablename__ = "clientes"
    __table_args__ = (Index("ix_clientes_tenant_nome", "tenant_id", "nome_fantasia"),)

    razao_social: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nome_fantasia: Mapped[str] = mapped_column(String(255), nullable=False)
    nome_contato: Mapped[str | None] = mapped_column(String(200), nullable=True)
    cnpj: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(254), nullable=True)
    telefone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    estado: Mapped[str | None] = mapped_column(String(2), nullable=True)
    segmento: Mapped[str | None] = mapped_column(String(60), nullable=True)
    canal: Mapped[str | None] = mapped_column(String(40), nullable=True)
    observacoes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    ativo: Mapped[bool] = mapped_column(default=True, nullable=False)
