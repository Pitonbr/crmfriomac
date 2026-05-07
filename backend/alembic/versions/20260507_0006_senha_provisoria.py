"""senha_provisoria — flag que força troca de senha no primeiro acesso.

Revision ID: 0006_senha_provisoria
Revises: 0005_notificacoes
Create Date: 2026-05-07 12:00:00 UTC
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_senha_provisoria"
down_revision: str | None = "0005_notificacoes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "senha_provisoria",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "senha_provisoria")
