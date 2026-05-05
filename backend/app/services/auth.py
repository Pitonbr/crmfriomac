"""AuthService — login, refresh, logout, lookup do usuário corrente."""

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.auth import (
    LoginAttemptRepository,
    RefreshTokenRepository,
    TenantRepository,
    UserRepository,
)
from app.security.passwords import hash_password, needs_rehash, verify_password
from app.security.tokens import (
    TokenError,
    decode_token,
    issue_access_token,
    issue_refresh_token,
    refresh_expiry,
)


class AuthError(Exception):
    """Erro genérico de autenticação. Status code mapeado no router."""


class InvalidCredentials(AuthError):
    """Email/senha errados ou tenant inexistente. Mensagem genérica intencional."""


class AccountLocked(AuthError):
    """Conta bloqueada por excesso de tentativas."""


@dataclass(frozen=True)
class IssuedTokens:
    access_token: str
    refresh_token: str
    user: User


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.tenants = TenantRepository(session)
        self.users = UserRepository(session)
        self.tokens = RefreshTokenRepository(session)
        self.attempts = LoginAttemptRepository(session)

    async def login(
        self,
        *,
        email: str,
        senha: str,
        tenant_slug: str,
        ip: str | None,
        user_agent: str | None,
    ) -> IssuedTokens:
        """Valida credenciais e emite par de tokens."""
        if await self.attempts.is_locked(email):
            await self.attempts.record(
                email=email, ip=ip, user_agent=user_agent, sucesso=False
            )
            raise AccountLocked("conta temporariamente bloqueada")

        tenant = await self.tenants.get_by_slug(tenant_slug)
        if tenant is None:
            await self.attempts.record(
                email=email, ip=ip, user_agent=user_agent, sucesso=False
            )
            raise InvalidCredentials("credenciais inválidas")

        user = await self.users.get_by_email_and_tenant(email, tenant.id)
        if user is None or not verify_password(senha, user.senha_hash):
            await self.attempts.record(
                email=email, ip=ip, user_agent=user_agent, sucesso=False
            )
            raise InvalidCredentials("credenciais inválidas")

        # Re-hash transparente se parâmetros Argon2 evoluíram
        if needs_rehash(user.senha_hash):
            user.senha_hash = hash_password(senha)
            await self.session.flush()

        access, _ = issue_access_token(
            user_id=user.id, tenant_id=user.tenant_id, role=user.role.value
        )
        refresh, jti, _ = issue_refresh_token(
            user_id=user.id, tenant_id=user.tenant_id, role=user.role.value
        )
        await self.tokens.create(
            user_id=user.id,
            jti=jti,
            expira_em=refresh_expiry(),
            user_agent=user_agent,
            ip=ip,
        )
        await self.attempts.record(
            email=email, ip=ip, user_agent=user_agent, sucesso=True
        )
        return IssuedTokens(access_token=access, refresh_token=refresh, user=user)

    async def refresh(
        self,
        *,
        refresh_token: str,
        ip: str | None,
        user_agent: str | None,
    ) -> IssuedTokens:
        """Rotação de refresh: valida, revoga o atual, emite par novo."""
        try:
            payload = decode_token(refresh_token, expected_type="refresh")
        except TokenError as e:
            raise InvalidCredentials("refresh inválido") from e

        if payload.jti is None:
            raise InvalidCredentials("refresh sem jti")

        stored = await self.tokens.get_active_by_jti(payload.jti)
        if stored is None:
            raise InvalidCredentials("refresh revogado ou expirado")

        # Carrega o usuário associado para emitir novo access
        user = await self.users.get_by_id(payload.sub)
        if user is None or not user.ativo:
            await self.tokens.revoke(stored)
            raise InvalidCredentials("usuário desativado")

        # Rotação: revoga o atual antes de emitir o novo (mitiga replay)
        await self.tokens.revoke(stored)

        access, _ = issue_access_token(
            user_id=user.id, tenant_id=user.tenant_id, role=user.role.value
        )
        new_refresh, jti, _ = issue_refresh_token(
            user_id=user.id, tenant_id=user.tenant_id, role=user.role.value
        )
        await self.tokens.create(
            user_id=user.id,
            jti=jti,
            expira_em=refresh_expiry(),
            user_agent=user_agent,
            ip=ip,
        )
        return IssuedTokens(access_token=access, refresh_token=new_refresh, user=user)

    async def logout(self, *, refresh_token: str | None) -> None:
        """Revoga o refresh corrente. Se o cookie não vier, é no-op (idempotente)."""
        if not refresh_token:
            return
        try:
            payload = decode_token(refresh_token, expected_type="refresh")
        except TokenError:
            return
        if payload.jti is None:
            return
        stored = await self.tokens.get_active_by_jti(payload.jti)
        if stored is not None:
            await self.tokens.revoke(stored)
