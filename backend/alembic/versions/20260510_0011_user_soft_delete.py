"""Soft delete para usuários — coluna excluido_em.

Registros de usuário NUNCA são removidos do banco.
A exclusão apenas seta excluido_em e ativo=False.

Revision ID: 0011_user_soft_delete
Revises: 0010_roles_audit_log
Create Date: 2026-05-10
"""

import sqlalchemy as sa
from alembic import op

revision = "0011_user_soft_delete"
down_revision = "0010_roles_audit_log"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("excluido_em", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "excluido_em")
