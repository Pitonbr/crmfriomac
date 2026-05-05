"""extra_modules — orcamentos, comissoes, entregas (Sprint 4).

Revision ID: 0004_extra_modules
Revises: 0003_business_schema
Create Date: 2026-05-05 12:00:00 UTC
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_extra_modules"
down_revision: str | None = "0003_business_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TENANT_TABLES = ["orcamentos", "comissoes", "entregas"]


def upgrade() -> None:
    # ── orcamentos ───────────────────────────────────────────────
    op.create_table(
        "orcamentos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "lead_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("leads.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("numero", sa.String(40), nullable=False),
        sa.Column("versao", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("valor_total", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="rascunho"),
        sa.Column("data_envio", sa.DateTime(timezone=True), nullable=True),
        sa.Column("validade_ate", sa.Date(), nullable=True),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.Column(
            "criado_por",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('rascunho','enviado','aceito','recusado','expirado')",
            name="ck_orcamentos_status_valid",
        ),
    )
    op.create_index("ix_orcamentos_tenant_id", "orcamentos", ["tenant_id"])
    op.create_index("ix_orcamentos_lead", "orcamentos", ["lead_id"])

    # ── comissoes ────────────────────────────────────────────────
    op.create_table(
        "comissoes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "representante_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("representantes.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "lead_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("leads.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "orcamento_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("orcamentos.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("valor_base", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("percentual", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("valor_comissao", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pendente"),
        sa.Column(
            "comprovante_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("anexos.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("data_pagamento", sa.Date(), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('pendente','aprovada','paga','cancelada')",
            name="ck_comissoes_status_valid",
        ),
    )
    op.create_index("ix_comissoes_tenant_id", "comissoes", ["tenant_id"])
    op.create_index("ix_comissoes_rep_status", "comissoes", ["representante_id", "status"])
    op.create_index("ix_comissoes_lead", "comissoes", ["lead_id"])

    # ── entregas ─────────────────────────────────────────────────
    op.create_table(
        "entregas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "lead_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("leads.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("prazo_estimado", sa.Date(), nullable=True),
        sa.Column("prazo_real", sa.Date(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="planejada"),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('planejada','em_producao','entregue','atrasada')",
            name="ck_entregas_status_valid",
        ),
    )
    op.create_index("ix_entregas_tenant_id", "entregas", ["tenant_id"])
    op.create_index("ix_entregas_status_prazo", "entregas", ["status", "prazo_estimado"])

    # ── RLS ──────────────────────────────────────────────────────
    for table in TENANT_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")
        op.execute(
            f"""
            CREATE POLICY tenant_isolation ON {table}
                USING (
                    tenant_id::text = current_setting('app.tenant_id', true)
                    OR current_setting('app.tenant_id', true) = ''
                )
                WITH CHECK (
                    tenant_id::text = current_setting('app.tenant_id', true)
                    OR current_setting('app.tenant_id', true) = ''
                );
            """
        )


def downgrade() -> None:
    for table in reversed(TENANT_TABLES):
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table};")
        op.execute(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")

    op.drop_table("entregas")
    op.drop_table("comissoes")
    op.drop_table("orcamentos")
