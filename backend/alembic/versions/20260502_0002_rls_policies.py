"""rls_policies — habilita Row-Level Security em users.

Revision ID: 0002_rls_policies
Revises: 0001_initial_auth
Create Date: 2026-05-02 12:30:00 UTC

Sprint 2: aplica RLS apenas em `users` (única tabela com tenant_id por agora).
Sprint 3+: estende para leads, clientes, representantes, etc.

A app conecta com role `app_user` SEM bypass; toda query é filtrada
automaticamente por `current_setting('app.tenant_id')::uuid`.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0002_rls_policies"
down_revision: str | None = "0001_initial_auth"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # users: isolamento por tenant via RLS
    op.execute("ALTER TABLE users ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE users FORCE ROW LEVEL SECURITY;")
    op.execute(
        """
        CREATE POLICY tenant_isolation ON users
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
    op.execute("DROP POLICY IF EXISTS tenant_isolation ON users;")
    op.execute("ALTER TABLE users NO FORCE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE users DISABLE ROW LEVEL SECURITY;")
