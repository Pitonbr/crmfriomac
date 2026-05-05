"""notificacoes — Sprint 5.

Revision ID: 0005_notificacoes
Revises: 0004_extra_modules
Create Date: 2026-05-05 13:00:00 UTC
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_notificacoes"
down_revision: str | None = "0004_extra_modules"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "notificacoes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("tipo", sa.String(40), nullable=False),
        sa.Column("titulo", sa.String(200), nullable=False),
        sa.Column("mensagem", sa.Text(), nullable=False),
        sa.Column("link", sa.String(500), nullable=True),
        sa.Column("lida_em", sa.DateTime(timezone=True), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_notificacoes_tenant_id", "notificacoes", ["tenant_id"])
    op.create_index("ix_notificacoes_user_lida", "notificacoes", ["user_id", "lida_em"])

    op.execute("ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE notificacoes FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        CREATE POLICY tenant_isolation ON notificacoes
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
    op.execute("DROP POLICY IF EXISTS tenant_isolation ON notificacoes;")
    op.execute("ALTER TABLE notificacoes NO FORCE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE notificacoes DISABLE ROW LEVEL SECURITY;")
    op.drop_table("notificacoes")
