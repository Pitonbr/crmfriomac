"""Engine async + sessionmaker.

A `get_session` em `app/deps/db.py` injeta `app.tenant_id`, `app.user_id`,
`app.role` em cada request via `SET LOCAL` (RLS).
"""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(
    str(settings.database_url),
    echo=settings.app_env == "dev" and settings.log_level == "debug",
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def session_no_tenant() -> AsyncIterator[AsyncSession]:
    """Session sem `SET LOCAL` (uso restrito: login, healthcheck).

    NÃO USE em rotas de negócio — todas devem passar por `get_session`
    em `app/deps/db.py` que aplica o contexto de tenant via RLS.
    """
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
