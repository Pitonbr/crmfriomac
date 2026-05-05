"""business_schema — stages, clientes, representantes, leads, observacoes, anexos.

Revision ID: 0003_business_schema
Revises: 0002_rls_policies
Create Date: 2026-05-02 13:00:00 UTC

Cria as 6 tabelas centrais do CRM + RLS em todas + índices.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_business_schema"
down_revision: str | None = "0002_rls_policies"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TENANT_TABLES = ["stages", "clientes", "representantes", "leads", "observacoes", "anexos"]


def upgrade() -> None:
    # ── stages ───────────────────────────────────────────────────
    op.create_table(
        "stages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("slug", sa.String(40), nullable=False),
        sa.Column("label", sa.String(80), nullable=False),
        sa.Column("icone", sa.String(10), nullable=True),
        sa.Column("sla_horas", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cor", sa.String(20), nullable=False),
        sa.Column("prob_pct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("tenant_id", "slug", name="uq_stages_tenant_slug"),
    )
    op.create_index("ix_stages_tenant_id", "stages", ["tenant_id"])
    op.create_index("ix_stages_tenant_ordem", "stages", ["tenant_id", "ordem"])

    # ── clientes ─────────────────────────────────────────────────
    op.create_table(
        "clientes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("razao_social", sa.String(255), nullable=True),
        sa.Column("nome_fantasia", sa.String(255), nullable=False),
        sa.Column("nome_contato", sa.String(200), nullable=True),
        sa.Column("cnpj", sa.String(20), nullable=True),
        sa.Column("email", sa.String(254), nullable=True),
        sa.Column("telefone", sa.String(40), nullable=True),
        sa.Column("cidade", sa.String(100), nullable=True),
        sa.Column("estado", sa.String(2), nullable=True),
        sa.Column("segmento", sa.String(60), nullable=True),
        sa.Column("canal", sa.String(40), nullable=True),
        sa.Column("observacoes", sa.String(2000), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_clientes_tenant_id", "clientes", ["tenant_id"])
    op.create_index("ix_clientes_tenant_nome", "clientes", ["tenant_id", "nome_fantasia"])
    op.create_index("ix_clientes_cnpj", "clientes", ["cnpj"])

    # ── representantes ───────────────────────────────────────────
    op.create_table(
        "representantes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column("canal", sa.String(20), nullable=False),
        sa.Column("comissao_pct", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("cidade", sa.String(100), nullable=True),
        sa.Column("estado", sa.String(2), nullable=True),
        sa.Column("email", sa.String(254), nullable=True),
        sa.Column("telefone", sa.String(40), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "canal IN ('canal_proprio','representante')",
            name="ck_representantes_canal_valid",
        ),
    )
    op.create_index("ix_representantes_tenant_id", "representantes", ["tenant_id"])
    op.create_index("ix_representantes_tenant_nome", "representantes", ["tenant_id", "nome"])
    op.create_index("ix_representantes_user_id", "representantes", ["user_id"])

    # ── leads ────────────────────────────────────────────────────
    op.create_table(
        "leads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("codigo", sa.String(40), nullable=False),
        sa.Column("codigo_legado", sa.String(40), nullable=True),
        sa.Column(
            "cliente_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clientes.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "representante_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("representantes.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "stage_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("stages.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "criado_por",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("projeto", sa.String(80), nullable=True),
        sa.Column("valor", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("prioridade", sa.String(10), nullable=False, server_default="media"),
        sa.Column("status", sa.String(20), nullable=False, server_default="em_aberto"),
        sa.Column("motivo_perda", sa.String(500), nullable=True),
        sa.Column("data_abertura", sa.DateTime(timezone=True), nullable=False),
        sa.Column("data_ultima_movimentacao", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sla_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("tags", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("metadados", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("ganho_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("perdido_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("excluido_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "prioridade IN ('baixa','media','alta')", name="ck_leads_prioridade_valid"
        ),
        sa.CheckConstraint(
            "status IN ('em_aberto','ganho','perdido','em_producao')",
            name="ck_leads_status_valid",
        ),
    )
    op.create_index("ix_leads_tenant_id", "leads", ["tenant_id"])
    op.create_index("ix_leads_cliente_id", "leads", ["cliente_id"])
    op.create_index("ix_leads_representante_id", "leads", ["representante_id"])
    op.create_index("ix_leads_stage_id", "leads", ["stage_id"])
    op.create_index("ix_leads_tenant_stage", "leads", ["tenant_id", "stage_id"])
    op.create_index("ix_leads_tenant_status", "leads", ["tenant_id", "status"])
    op.create_index("ix_leads_codigo", "leads", ["tenant_id", "codigo"])
    op.create_index("ix_leads_excluido_em", "leads", ["excluido_em"])
    op.execute("CREATE INDEX ix_leads_tags_gin ON leads USING GIN (tags)")

    # ── observacoes ──────────────────────────────────────────────
    op.create_table(
        "observacoes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "lead_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("leads.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "autor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("autor_nome", sa.String(200), nullable=False),
        sa.Column("texto", sa.Text(), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False, server_default="manual"),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_observacoes_tenant_id", "observacoes", ["tenant_id"])
    op.create_index("ix_observacoes_lead", "observacoes", ["lead_id", "criado_em"])

    # ── anexos ───────────────────────────────────────────────────
    op.create_table(
        "anexos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "lead_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("leads.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "representante_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("representantes.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("nome_arquivo", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(100), nullable=False),
        sa.Column("tamanho_bytes", sa.BigInteger(), nullable=False),
        sa.Column("storage_key", sa.String(512), nullable=False, unique=True),
        sa.Column(
            "autor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("autor_nome", sa.String(200), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "(lead_id IS NOT NULL)::int + (representante_id IS NOT NULL)::int = 1",
            name="ck_anexos_anexos_exactly_one_owner",
        ),
    )
    op.create_index("ix_anexos_tenant_id", "anexos", ["tenant_id"])
    op.create_index("ix_anexos_lead", "anexos", ["lead_id"])
    op.create_index("ix_anexos_rep", "anexos", ["representante_id"])

    # ── RLS em todas as 6 tabelas ────────────────────────────────
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

    op.drop_table("anexos")
    op.drop_table("observacoes")
    op.drop_table("leads")
    op.drop_table("representantes")
    op.drop_table("clientes")
    op.drop_table("stages")
