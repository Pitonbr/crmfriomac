"""Endpoints de gerenciamento de usuários (master e adm_comercial)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.auth import CurrentUserDep, get_current_user, require_role
from app.deps.db import get_session
from app.models.representante import Representante
from app.models.user import User, UserRole
from app.repositories.auth import UserRepository
from app.schemas.user_mgmt import (
    AuditLogOut,
    UserCreate,
    UserCreatedResponse,
    UserOut,
    UserUpdate,
)
from app.services.user_mgmt import (
    PermissionDenied,
    UserAlreadyExists,
    UserManagementService,
)

router = APIRouter(
    prefix="/users",
    tags=["users"],
    dependencies=[Depends(get_current_user)],
)

# Roles que podem acessar gestão de usuários
_CAN_MANAGE = require_role(UserRole.MASTER, UserRole.ADM_COMERCIAL)


@router.get("", response_model=list[UserOut])
async def list_users(
    user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[UserOut]:
    """Lista usuários do tenant. Master vê todos; adm_comercial vê todos."""
    svc = UserManagementService(session)
    users = await svc.list_users(user.tenant_id)
    # adm_comercial não vê o master
    if user.role == UserRole.ADM_COMERCIAL:
        users = [u for u in users if u.role != UserRole.MASTER]
    return [UserOut.model_validate(u) for u in users]


@router.post("", response_model=UserCreatedResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    actor: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserCreatedResponse:
    """Cria novo usuário com senha provisória.

    Master pode criar qualquer role.
    adm_comercial só pode criar representante.
    """
    if actor.role not in (UserRole.MASTER, UserRole.ADM_COMERCIAL):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="permissão insuficiente")

    svc = UserManagementService(session)
    try:
        new_user, temp_pwd = await svc.create_user(
            tenant_id=actor.tenant_id,
            payload=payload,
            criado_por=actor,
        )
    except UserAlreadyExists as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e)) from e
    except PermissionDenied as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e

    return UserCreatedResponse(
        user=UserOut.model_validate(new_user),
        senha_provisoria=temp_pwd,
    )


@router.patch("/{user_id}", response_model=UserOut, dependencies=[require_role(UserRole.MASTER)])
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    actor: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserOut:
    """Atualiza dados de um usuário. Somente master."""
    repo = UserRepository(session)
    target = await repo.get_by_id(user_id)
    if target is None or target.tenant_id != actor.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    svc = UserManagementService(session)
    updated = await svc.update_user(user=target, payload=payload, actor=actor)
    return UserOut.model_validate(updated)


@router.post("/{user_id}/toggle", response_model=UserOut, dependencies=[require_role(UserRole.MASTER)])
async def toggle_user(
    user_id: UUID,
    actor: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserOut:
    """Ativa ou desativa usuário. Somente master."""
    if str(user_id) == str(actor.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="não é possível desativar a própria conta",
        )

    repo = UserRepository(session)
    target = await repo.get_by_id(user_id)
    if target is None or target.tenant_id != actor.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    svc = UserManagementService(session)
    updated = await svc.toggle_user(user=target, actor=actor)
    return UserOut.model_validate(updated)


@router.post("/{user_id}/reset-password", response_model=dict, dependencies=[require_role(UserRole.MASTER)])
async def reset_password(
    user_id: UUID,
    actor: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict:
    """Reseta senha para nova provisória. Somente master."""
    repo = UserRepository(session)
    target = await repo.get_by_id(user_id)
    if target is None or target.tenant_id != actor.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    svc = UserManagementService(session)
    new_pwd = await svc.reset_password(user=target, actor=actor)
    return {"senha_provisoria": new_pwd, "user_nome": target.nome}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[require_role(UserRole.MASTER)])
async def delete_user(
    user_id: UUID,
    actor: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    """Exclui permanentemente um usuário. Somente master. Não permite auto-exclusão."""
    if str(user_id) == str(actor.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="não é possível excluir a própria conta",
        )

    repo = UserRepository(session)
    target = await repo.get_by_id(user_id)
    if target is None or target.tenant_id != actor.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if target.role == UserRole.MASTER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="não é possível excluir outro usuário master",
        )

    from app.db.base import utcnow as _utcnow
    agora = _utcnow()

    # SOFT DELETE — nunca remove o registro; bloqueia login e marca data
    target.ativo = False
    target.excluido_em = agora

    # Se houver um Representante vinculado a este usuário → inativa imediatamente
    rep_stmt = select(Representante).where(Representante.user_id == target.id)
    rep_vinculado = (await session.execute(rep_stmt)).scalar_one_or_none()
    if rep_vinculado is not None and rep_vinculado.ativo:
        rep_vinculado.ativo = False

    svc = UserManagementService(session)
    rep_info = f" Representante '{rep_vinculado.nome}' inativado automaticamente." if rep_vinculado else ""
    await svc._log(
        tenant_id=actor.tenant_id,
        actor=actor,
        acao="delete",
        entidade="user",
        entidade_id=str(target.id),
        descricao=(
            f"Usuário '{target.nome}' ({target.role}) marcado como EXCLUÍDO por {actor.nome}. "
            f"Todos os dados deste usuário foram preservados na base.{rep_info}"
        ),
    )
    await session.flush()


@router.get("/audit-log", response_model=list[AuditLogOut], dependencies=[require_role(UserRole.MASTER)])
async def get_audit_log(
    user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[AuditLogOut]:
    """Log completo de auditoria do tenant. Somente master."""
    svc = UserManagementService(session)
    logs = await svc.get_audit_log(user.tenant_id)
    return [AuditLogOut.model_validate(log) for log in logs]
