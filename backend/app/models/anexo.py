"""Modelo Anexo — arquivos vinculados a leads, reps, comissoes (storage no MinIO)."""

from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Anexo(Base, UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin):
    """Polimorfo: vincula a lead OU representante OU comissão (apenas um)."""

    __tablename__ = "anexos"
    __table_args__ = (
        CheckConstraint(
            "(lead_id IS NOT NULL)::int + (representante_id IS NOT NULL)::int = 1",
            name="anexos_exactly_one_owner",
        ),
        Index("ix_anexos_lead", "lead_id"),
        Index("ix_anexos_rep", "representante_id"),
    )

    lead_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("leads.id", ondelete="CASCADE"), nullable=True
    )
    representante_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("representantes.id", ondelete="CASCADE"), nullable=True
    )

    nome_arquivo: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    tamanho_bytes: Mapped[int] = mapped_column(nullable=False)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)

    autor_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    autor_nome: Mapped[str] = mapped_column(String(200), nullable=False)
