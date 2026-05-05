"""Testes de Row-Level Security — isolamento entre tenants."""

from uuid import uuid4

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.rls import set_rls_context
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.security.passwords import hash_password


@pytest.mark.asyncio
@pytest.mark.integration
async def test_users_isolated_by_tenant(db_session: AsyncSession) -> None:
    """User de um tenant NÃO deve aparecer quando contexto é outro tenant."""
    # 2 tenants distintos
    t1 = Tenant(id=uuid4(), nome="Empresa A", slug="empresa-a", ativo=True)
    t2 = Tenant(id=uuid4(), nome="Empresa B", slug="empresa-b", ativo=True)
    db_session.add_all([t1, t2])
    await db_session.flush()

    # 1 user em cada tenant
    u1 = User(
        id=uuid4(),
        tenant_id=t1.id,
        nome="User A",
        email="a@a.test",
        senha_hash=hash_password("x"),
        role=UserRole.MASTER,
        ativo=True,
    )
    u2 = User(
        id=uuid4(),
        tenant_id=t2.id,
        nome="User B",
        email="b@b.test",
        senha_hash=hash_password("x"),
        role=UserRole.MASTER,
        ativo=True,
    )
    db_session.add_all([u1, u2])
    await db_session.commit()

    # Contexto = tenant A → vê só User A
    await set_rls_context(db_session, tenant_id=t1.id, user_id=u1.id, role="master")
    rows = (await db_session.execute(select(User))).scalars().all()
    assert len(rows) == 1
    assert rows[0].id == u1.id

    # Mesma sessão, mas trocando contexto para tenant B → vê só User B
    await set_rls_context(db_session, tenant_id=t2.id, user_id=u2.id, role="master")
    rows = (await db_session.execute(select(User))).scalars().all()
    assert len(rows) == 1
    assert rows[0].id == u2.id


@pytest.mark.asyncio
@pytest.mark.integration
async def test_set_local_does_not_leak_after_commit(db_session: AsyncSession) -> None:
    """`SET LOCAL` é resetado no commit — próxima TX começa sem contexto."""
    t = Tenant(id=uuid4(), nome="X", slug="x", ativo=True)
    db_session.add(t)
    await db_session.commit()

    # Define contexto em uma TX
    await db_session.execute(text("BEGIN"))
    await set_rls_context(db_session, tenant_id=t.id, user_id=uuid4(), role="master")
    val = (await db_session.execute(text("SELECT current_setting('app.tenant_id', true)"))).scalar()
    assert val == str(t.id)
    await db_session.execute(text("COMMIT"))

    # Após commit, contexto sumiu
    val = (await db_session.execute(text("SELECT current_setting('app.tenant_id', true)"))).scalar()
    assert val == ""
