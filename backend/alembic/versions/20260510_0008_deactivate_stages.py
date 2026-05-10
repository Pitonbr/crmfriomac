"""Deactivate stages negociacao e decisao_final; move leads para stages adjacentes.

Revision ID: 0008_deactivate_stages
Revises: 0007_lead_fields
Create Date: 2026-05-10
"""

from alembic import op

revision = "0008_deactivate_stages"
down_revision = "0007_lead_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Move leads de negociacao → follow_up
    op.execute("""
        UPDATE leads l
        SET stage_id = (
            SELECT id FROM stages WHERE slug = 'follow_up' AND tenant_id = l.tenant_id LIMIT 1
        ),
        data_ultima_movimentacao = NOW()
        WHERE l.stage_id IN (
            SELECT id FROM stages WHERE slug = 'negociacao'
        )
        AND l.excluido_em IS NULL
    """)

    # Move leads de decisao_final → contrato_env
    op.execute("""
        UPDATE leads l
        SET stage_id = (
            SELECT id FROM stages WHERE slug = 'contrato_env' AND tenant_id = l.tenant_id LIMIT 1
        ),
        data_ultima_movimentacao = NOW()
        WHERE l.stage_id IN (
            SELECT id FROM stages WHERE slug = 'decisao_final'
        )
        AND l.excluido_em IS NULL
    """)

    # Deactivate both stages
    op.execute("""
        UPDATE stages SET ativo = false
        WHERE slug IN ('negociacao', 'decisao_final')
    """)


def downgrade() -> None:
    op.execute("""
        UPDATE stages SET ativo = true
        WHERE slug IN ('negociacao', 'decisao_final')
    """)
