"""stages negociacao+reativacao, novos campos lead e entrega.

Revision ID: 0007_negociacao_reativacao_lead_fields
Revises: 0006_senha_provisoria
Create Date: 2026-05-08 00:00:00 UTC

Adiciona:
- Colunas de acompanhamento comercial detalhado na tabela leads
- Colunas de retrabalho na tabela entregas
Stages negociacao/reativacao são inseridos pelo seed (ensure_stages), não aqui.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007_negociacao_reativacao_lead_fields"
down_revision: str | None = "0006_senha_provisoria"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── novos campos em leads ────────────────────────────────────────
    op.add_column("leads", sa.Column("data_ultimo_contato", sa.DateTime(timezone=True), nullable=True))
    op.add_column("leads", sa.Column("tipo_ultimo_contato", sa.String(30), nullable=True))
    op.add_column("leads", sa.Column("projeto_2d_enviado", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("leads", sa.Column("projeto_2d_data", sa.Date(), nullable=True))
    op.add_column("leads", sa.Column("projeto_3d_enviado", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("leads", sa.Column("projeto_3d_data", sa.Date(), nullable=True))
    op.add_column("leads", sa.Column("probabilidade_override", sa.Numeric(5, 2), nullable=True))
    op.add_column("leads", sa.Column("valor_entrada", sa.Numeric(14, 2), nullable=True))
    op.add_column("leads", sa.Column("percentual_entrada", sa.Numeric(5, 2), nullable=True))
    op.add_column("leads", sa.Column("forma_pagamento", sa.String(80), nullable=True))

    # ── novos campos em entregas ─────────────────────────────────────
    op.add_column("entregas", sa.Column("retrabalho", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("entregas", sa.Column("retrabalho_desc", sa.Text(), nullable=True))
    op.add_column("entregas", sa.Column("satisfacao", sa.Integer(), nullable=True))


def downgrade() -> None:
    for col in ("data_ultimo_contato", "tipo_ultimo_contato", "projeto_2d_enviado",
                "projeto_2d_data", "projeto_3d_enviado", "projeto_3d_data",
                "probabilidade_override", "valor_entrada", "percentual_entrada",
                "forma_pagamento"):
        op.drop_column("leads", col)

    for col in ("retrabalho", "retrabalho_desc", "satisfacao"):
        op.drop_column("entregas", col)
