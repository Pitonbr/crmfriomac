"""Dependencies de autenticação — get_current_user, require_role.

`get_current_user` lê o cookie `friomac_access`, valida o JWT, busca o user no
DB e injeta em `request.state.user` (para `get_session` aplicar RLS).
"""

from collections.abc import Iterable
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.db import get_session_anonymous
from app.models.user import User, UserRole
from app.repositories.auth import UserRepository
from app.security.cookies import ACCESS_COOKIE
from app.security.tokens import TokenError, decode_token


async def get_current_user(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_session_anonymous)],
) -> User:
    """Valida o cookie de access e retorna o User. 401 se inválido/ausente."""
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="não autenticado",
            headers={"WWW-Authenticate": "Cookie"},
        )

    try:
        payload = decode_token(token, expected_type="access")
    except TokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Cookie"},
        ) from e

    repo = UserRepository(session)
    user = await repo.get_by_id(payload.sub)
    if user is None or not user.ativo or user.excluido_em is not None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="usuário inativo ou excluído")

    request.state.user = user
    return user


def require_role(*allowed: UserRole) -> object:
    """Factory de dependency que exige o user ter um dos `allowed` roles.

    Uso:
        @router.get("/...", dependencies=[Depends(require_role(UserRole.MASTER))])
    """
    allowed_set = set(allowed)

    async def _checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in allowed_set:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="permissão insuficiente",
            )
        return user

    return Depends(_checker)


def require_any_role(allowed: Iterable[UserRole]) -> object:
    """Versão runtime de require_role para listas dinâmicas."""
    return require_role(*allowed)


CurrentUserDep = Annotated[User, Depends(get_current_user)]
