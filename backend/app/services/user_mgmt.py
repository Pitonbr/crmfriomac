"""Serviço de gerenciamento de usuários — criação, inativação, auditoria."""

import secrets
import string
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import utcnow
from app.models.audit_log import AuditLog
from app.models.notificacao import Notificacao, NotificacaoTipo
from app.models.user import User, UserRole
from app.repositories.auth import UserRepository
from app.security.passwords import hash_password
from app.schemas.user_mgmt import UserCreate, UserUpdate


# Roles que podem ser criados por adm_comercial
ADM_COMERCIAL_ALLOWED_ROLES = {UserRole.REPRESENTANTE}

# Roles que adm_comercial pode criar para si mesmo listar
ALL_MANAGEABLE_ROLES = {
    UserRole.ADM_COMERCIAL,
    UserRole.ADM_MARKETING,
    UserRole.ADM_OPERACIONAL,
    UserRole.REPRESENTANTE,
}


def generate_temp_password(length: int = 12) -> str:
    """Gera senha provisória segura com pelo menos 1 maiúsc, 1 minúsc, 1 dígito, 1 especial."""
    chars = string.ascii_letters + string.digits + "!@#$%"
    while True:
        pwd = "".join(secrets.choice(chars) for _ in range(length))
        if (
            any(c.isupper() for c in pwd)
            and any(c.islower() for c in pwd)
            and any(c.isdigit() for c in pwd)
            and any(c in "!@#$%" for c in pwd)
        ):
            return pwd


class UserAlreadyExists(Exception):
    pass


class PermissionDenied(Exception):
    pass


class UserManagementService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_users(self, tenant_id: UUID) -> list[User]:
        stmt = select(User).where(User.tenant_id == tenant_id).order_by(User.nome)
        return list((await self.session.execute(stmt)).scalars().all())

    async def get_audit_log(self, tenant_id: UUID, limit: int = 200) -> list[AuditLog]:
        stmt = (
            select(AuditLog)
            .where(AuditLog.tenant_id == tenant_id)
            .order_by(AuditLog.criado_em.desc())
            .limit(limit)
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def create_user(
        self,
        *,
        tenant_id: UUID,
        payload: UserCreate,
        criado_por: User,
    ) -> tuple[User, str]:
        """Cria usuário e retorna (user, senha_provisória).

        adm_comercial só pode criar usuários com role REPRESENTANTE.
        """
        # Verificar permissão de criação de role
        if criado_por.role == UserRole.ADM_COMERCIAL:
            if payload.role not in ADM_COMERCIAL_ALLOWED_ROLES:
                raise PermissionDenied(
                    "adm_comercial só pode criar usuários com role 'representante'"
                )

        # Verificar email único no tenant
        repo = UserRepository(self.session)
        existing = await repo.get_by_email_and_tenant(payload.email.lower(), tenant_id)
        if existing is not None:
            raise UserAlreadyExists(f"email '{payload.email}' já cadastrado neste tenant")

        temp_pwd = generate_temp_password()
        user = User(
            id=uuid4(),
            tenant_id=tenant_id,
            nome=payload.nome.strip(),
            email=payload.email.lower(),
            telefone=payload.telefone,
            senha_hash=hash_password(temp_pwd),
            role=payload.role,
            ativo=True,
            senha_provisoria=True,
        )
        self.session.add(user)
        await self.session.flush()

        # Audit log
        await self._log(
            tenant_id=tenant_id,
            actor=criado_por,
            acao="create",
            entidade="user",
            entidade_id=str(user.id),
            descricao=f"Usuário '{user.nome}' ({user.role}) criado por {criado_por.nome}.",
        )

        return user, temp_pwd

    async def update_user(
        self,
        *,
        user: User,
        payload: UserUpdate,
        actor: User,
    ) -> User:
        """Atualiza dados do usuário (apenas master)."""
        changes: list[str] = []
        for field, value in payload.model_dump(exclude_unset=True).items():
            old = getattr(user, field, None)
            setattr(user, field, value)
            if old != value:
                changes.append(f"{field}: {old!r} → {value!r}")

        if changes:
            await self._log(
                tenant_id=user.tenant_id,
                actor=actor,
                acao="update",
                entidade="user",
                entidade_id=str(user.id),
                descricao=f"Usuário '{user.nome}' atualizado: {'; '.join(changes)}",
            )
        await self.session.flush()
        return user

    async def toggle_user(self, *, user: User, actor: User) -> User:
        """Ativa ou desativa usuário."""
        novo = not user.ativo
        user.ativo = novo
        acao = "reativar" if novo else "inativar"

        await self._log(
            tenant_id=user.tenant_id,
            actor=actor,
            acao=acao,
            entidade="user",
            entidade_id=str(user.id),
            descricao=f"Usuário '{user.nome}' ({user.role}) {'reativado' if novo else 'inativado'} por {actor.nome}.",
        )
        await self.session.flush()
        return user

    async def reset_password(self, *, user: User, actor: User) -> str:
        """Reseta senha para nova provisória (retorna ela em plaintext)."""
        temp_pwd = generate_temp_password()
        user.senha_hash = hash_password(temp_pwd)
        user.senha_provisoria = True

        await self._log(
            tenant_id=user.tenant_id,
            actor=actor,
            acao="reset_password",
            entidade="user",
            entidade_id=str(user.id),
            descricao=f"Senha de '{user.nome}' resetada por {actor.nome}.",
        )
        await self.session.flush()
        return temp_pwd

    # ── Audit helpers ─────────────────────────────────────────────────────
    async def _log(
        self,
        *,
        tenant_id: UUID,
        actor: User,
        acao: str,
        entidade: str,
        entidade_id: str | None,
        descricao: str,
    ) -> None:
        log = AuditLog(
            id=uuid4(),
            tenant_id=tenant_id,
            user_id=actor.id,
            user_nome=actor.nome,
            user_role=str(actor.role),
            acao=acao,
            entidade=entidade,
            entidade_id=entidade_id,
            descricao=descricao,
            criado_em=utcnow(),
        )
        self.session.add(log)

        # Notifica o master (tipo auditoria = VERMELHO no sino)
        await self._notify_master(
            tenant_id=tenant_id,
            titulo=f"Auditoria: {acao.upper()} em {entidade}",
            mensagem=descricao,
            link="/config",
        )

    async def _notify_master(
        self,
        tenant_id: UUID,
        titulo: str,
        mensagem: str,
        link: str,
    ) -> None:
        """Cria notificação de auditoria para o(s) usuário(s) master do tenant."""
        stmt = select(User).where(
            User.tenant_id == tenant_id,
            User.role == UserRole.MASTER,
            User.ativo.is_(True),
        )
        masters = (await self.session.execute(stmt)).scalars().all()
        for master in masters:
            notif = Notificacao(
                id=uuid4(),
                tenant_id=tenant_id,
                user_id=master.id,
                tipo=NotificacaoTipo.AUDITORIA,
                titulo=titulo,
                mensagem=mensagem,
                link=link,
            )
            self.session.add(notif)


async def log_audit(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    actor: User,
    acao: str,
    entidade: str,
    entidade_id: str | None,
    descricao: str,
) -> None:
    """Função utilitária para registrar auditoria de qualquer endpoint."""
    svc = UserManagementService(session)
    await svc._log(
        tenant_id=tenant_id,
        actor=actor,
        acao=acao,
        entidade=entidade,
        entidade_id=entidade_id,
        descricao=descricao,
    )
