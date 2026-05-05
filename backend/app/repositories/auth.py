"""Repositories de auth — usuários, tenants, refresh tokens, login attempts."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import utcnow
from app.models.auth import AuthLoginAttempt, AuthRefreshToken
from app.models.tenant import Tenant
from app.models.user import User


class TenantRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_slug(self, slug: str) -> Tenant | None:
        stmt = select(Tenant).where(Tenant.slug == slug, Tenant.ativo.is_(True))
        return (await self.session.execute(stmt)).scalar_one_or_none()


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_email_and_tenant(self, email: str, tenant_id: UUID) -> User | None:
        stmt = select(User).where(
            User.email == email.lower(),
            User.tenant_id == tenant_id,
            User.ativo.is_(True),
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def get_by_id(self, user_id: UUID) -> User | None:
        return await self.session.get(User, user_id)


class RefreshTokenRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        user_id: UUID,
        jti: str,
        expira_em: datetime,
        user_agent: str | None,
        ip: str | None,
    ) -> AuthRefreshToken:
        token = AuthRefreshToken(
            user_id=user_id,
            jti=jti,
            expira_em=expira_em,
            user_agent=user_agent,
            ip=ip,
        )
        self.session.add(token)
        await self.session.flush()
        return token

    async def get_active_by_jti(self, jti: str) -> AuthRefreshToken | None:
        stmt = select(AuthRefreshToken).where(
            AuthRefreshToken.jti == jti,
            AuthRefreshToken.revogado_em.is_(None),
            AuthRefreshToken.expira_em > utcnow(),
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def revoke(self, token: AuthRefreshToken) -> None:
        token.revogado_em = utcnow()
        await self.session.flush()

    async def revoke_all_for_user(self, user_id: UUID) -> None:
        stmt = select(AuthRefreshToken).where(
            AuthRefreshToken.user_id == user_id,
            AuthRefreshToken.revogado_em.is_(None),
        )
        rows = (await self.session.execute(stmt)).scalars().all()
        for row in rows:
            row.revogado_em = utcnow()
        await self.session.flush()


class LoginAttemptRepository:
    """Histórico para rate-limit + lockout por email."""

    LOCKOUT_THRESHOLD = 10
    LOCKOUT_WINDOW = timedelta(minutes=30)

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def record(
        self,
        *,
        email: str,
        ip: str | None,
        user_agent: str | None,
        sucesso: bool,
    ) -> None:
        attempt = AuthLoginAttempt(
            email=email.lower(),
            ip=ip,
            user_agent=user_agent,
            sucesso=sucesso,
            criado_em=utcnow(),
        )
        self.session.add(attempt)
        await self.session.flush()

    async def is_locked(self, email: str) -> bool:
        """True se houve >= LOCKOUT_THRESHOLD falhas no email nas últimas LOCKOUT_WINDOW."""
        since = datetime.now(UTC) - self.LOCKOUT_WINDOW
        stmt = select(AuthLoginAttempt).where(
            and_(
                AuthLoginAttempt.email == email.lower(),
                AuthLoginAttempt.sucesso.is_(False),
                AuthLoginAttempt.criado_em >= since,
            )
        )
        result = (await self.session.execute(stmt)).scalars().all()
        return len(result) >= self.LOCKOUT_THRESHOLD
