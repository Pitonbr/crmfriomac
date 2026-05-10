"""Expande tabela representantes com campos financeiros, redes sociais e documentos.

Revision ID: 0009_rep_full_fields
Revises: 0008_deactivate_stages
Create Date: 2026-05-10
"""

import sqlalchemy as sa
from alembic import op

revision = "0009_rep_full_fields"
down_revision = "0008_deactivate_stages"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Identificação
    op.add_column("representantes", sa.Column("nome_fantasia", sa.String(200), nullable=True))
    op.add_column("representantes", sa.Column("razao_social", sa.String(200), nullable=True))
    op.add_column("representantes", sa.Column("cnpj", sa.String(20), nullable=True))

    # Contato complementar
    op.add_column("representantes", sa.Column("endereco", sa.String(255), nullable=True))
    op.add_column("representantes", sa.Column("cep", sa.String(10), nullable=True))

    # Financeiro
    op.add_column("representantes", sa.Column("banco", sa.String(100), nullable=True))
    op.add_column("representantes", sa.Column("agencia", sa.String(20), nullable=True))
    op.add_column("representantes", sa.Column("conta", sa.String(30), nullable=True))
    op.add_column("representantes", sa.Column("pix", sa.String(100), nullable=True))
    op.add_column("representantes", sa.Column("obs_financeiro", sa.Text, nullable=True))

    # Redes sociais
    op.add_column("representantes", sa.Column("instagram", sa.String(100), nullable=True))
    op.add_column("representantes", sa.Column("linkedin", sa.String(200), nullable=True))
    op.add_column("representantes", sa.Column("tiktok", sa.String(100), nullable=True))
    op.add_column("representantes", sa.Column("website", sa.String(200), nullable=True))
    op.add_column("representantes", sa.Column("outras_redes", sa.String(200), nullable=True))


def downgrade() -> None:
    for col in [
        "outras_redes", "website", "tiktok", "linkedin", "instagram",
        "obs_financeiro", "pix", "conta", "agencia", "banco",
        "cep", "endereco", "cnpj", "razao_social", "nome_fantasia",
    ]:
        op.drop_column("representantes", col)
