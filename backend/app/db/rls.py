"""Helpers de Row-Level Security (Postgres).

Cada request autenticada DEVE chamar `set_rls_context` antes de qualquer
query, para que as policies RLS filtrem por tenant_id/user_id/role.
"""

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def set_rls_context(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    user_id: UUID,
    role: str,
) -> None:
    """Define `app.tenant_id`, `app.user_id`, `app.role` no escopo da TX.

    `SET LOCAL` é resetado ao final do BEGIN/COMMIT corrente, garantindo que
    o contexto não vaze entre requests reusando a mesma conexão do pool.
    """
    await session.execute(
        text("SELECT set_config('app.tenant_id', :tenant_id, true)"),
        {"tenant_id": str(tenant_id)},
    )
    await session.execute(
        text("SELECT set_config('app.user_id', :user_id, true)"),
        {"user_id": str(user_id)},
    )
    await session.execute(
        text("SELECT set_config('app.role', :role, true)"),
        {"role": role},
    )


async def clear_rls_context(session: AsyncSession) -> None:
    """Limpa o contexto explicitamente (debug/teste). `SET LOCAL` já some no commit."""
    await session.execute(text("SELECT set_config('app.tenant_id', '', true)"))
    await session.execute(text("SELECT set_config('app.user_id', '', true)"))
    await session.execute(text("SELECT set_config('app.role', '', true)"))
