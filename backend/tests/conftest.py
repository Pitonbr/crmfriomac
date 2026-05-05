"""Fixtures globais — DB de teste, factories, client HTTP."""

from collections.abc import AsyncIterator
from uuid import uuid4

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.db.base import Base
from app.main import app
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.security.passwords import hash_password


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    """Engine de teste: cria schema limpo a cada sessão de testes."""
    engine = create_async_engine(str(settings.database_url), pool_pre_ping=True)
    async with engine.begin() as conn:
        # Reset completo entre execuções de pytest
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        # Aplica RLS na tabela users (espelha migration 0002)
        await conn.execute(text("ALTER TABLE users ENABLE ROW LEVEL SECURITY"))
        await conn.execute(text("ALTER TABLE users FORCE ROW LEVEL SECURITY"))
        await conn.execute(
            text(
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
        )
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncIterator[AsyncSession]:
    """Sessão limpa por teste — usa transação com rollback ao final."""
    SessionMaker = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)
    async with SessionMaker() as session:
        yield session
        # Cleanup explícito (ordem importa: FK)
        await session.execute(text("TRUNCATE auth_login_attempts CASCADE"))
        await session.execute(text("TRUNCATE auth_refresh_tokens CASCADE"))
        await session.execute(text("TRUNCATE users CASCADE"))
        await session.execute(text("TRUNCATE tenants CASCADE"))
        await session.commit()


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    """HTTP client async ASGI in-process."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def tenant(db_session: AsyncSession) -> Tenant:
    """Tenant default (`friomac`) para os testes."""
    t = Tenant(id=uuid4(), nome="Friomac Test", slug="friomac", ativo=True)
    db_session.add(t)
    await db_session.commit()
    return t


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession, tenant: Tenant) -> tuple[User, str]:
    """Cria admin master com senha conhecida ('test123!ABC'). Retorna (user, senha)."""
    plain = "test123!ABC"
    user = User(
        id=uuid4(),
        tenant_id=tenant.id,
        nome="Admin Test",
        email="admin@friomac.test",
        senha_hash=hash_password(plain),
        role=UserRole.MASTER,
        avatar="AT",
        grupo="Test",
        ativo=True,
    )
    db_session.add(user)
    await db_session.commit()
    return user, plain
