"""Novos roles, telefone no User, tabela audit_log, vendedor→representante.

Revision ID: 0010_roles_audit_log
Revises: 0009_rep_full_fields
Create Date: 2026-05-10
"""

import sqlalchemy as sa
from alembic import op

revision = "0010_roles_audit_log"
down_revision = "0009_rep_full_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Adiciona coluna telefone nos users
    op.add_column("users", sa.Column("telefone", sa.String(40), nullable=True))

    # 2. Migra vendedor → representante
    op.execute("""
        UPDATE users SET role = 'representante'
        WHERE role = 'vendedor'
    """)

    # 3. Cria tabela audit_log
    op.create_table(
        "audit_log",
        sa.Column("id", sa.UUID, primary_key=True),
        sa.Column("tenant_id", sa.UUID, nullable=False),
        sa.Column("user_id", sa.UUID, nullable=False),
        sa.Column("user_nome", sa.String(200), nullable=False),
        sa.Column("user_role", sa.String(40), nullable=False),
        sa.Column("acao", sa.String(40), nullable=False),
        sa.Column("entidade", sa.String(80), nullable=False),
        sa.Column("entidade_id", sa.String(40), nullable=True),
        sa.Column("descricao", sa.Text, nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_log_tenant_criado", "audit_log", ["tenant_id", "criado_em"])
    op.create_index("ix_audit_log_user_id", "audit_log", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_audit_log_user_id", "audit_log")
    op.drop_index("ix_audit_log_tenant_criado", "audit_log")
    op.drop_table("audit_log")
    op.execute("UPDATE users SET role = 'vendedor' WHERE role = 'representante'")
    op.drop_column("users", "telefone")
