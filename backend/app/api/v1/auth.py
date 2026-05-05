"""Endpoints de autenticação."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.auth import CurrentUserDep
from app.deps.db import get_session_anonymous
from app.schemas.auth import CurrentUser, LoginRequest, LoginResponse
from app.security.cookies import (
    REFRESH_COOKIE,
    clear_auth_cookies,
    set_access_cookie,
    set_refresh_cookie,
)
from app.services.auth import AccountLocked, AuthService, InvalidCredentials

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Login com email + senha + tenant_slug",
)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session_anonymous)],
) -> LoginResponse:
    service = AuthService(session)
    try:
        result = await service.login(
            email=payload.email,
            senha=payload.senha,
            tenant_slug=payload.tenant_slug,
            ip=_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
        )
    except AccountLocked as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e)
        ) from e
    except InvalidCredentials as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)
        ) from e

    set_access_cookie(response, result.access_token)
    set_refresh_cookie(response, result.refresh_token)
    return LoginResponse(user=CurrentUser.model_validate(result.user))


@router.post(
    "/refresh",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Rotaciona refresh + emite novo access",
)
async def refresh(
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session_anonymous)],
) -> LoginResponse:
    refresh_token = request.cookies.get(REFRESH_COOKIE)
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="refresh ausente"
        )

    service = AuthService(session)
    try:
        result = await service.refresh(
            refresh_token=refresh_token,
            ip=_client_ip(request),
            user_agent=request.headers.get("User-Agent"),
        )
    except InvalidCredentials as e:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)
        ) from e

    set_access_cookie(response, result.access_token)
    set_refresh_cookie(response, result.refresh_token)
    return LoginResponse(user=CurrentUser.model_validate(result.user))


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoga refresh + limpa cookies",
)
async def logout(
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session_anonymous)],
) -> Response:
    refresh_token = request.cookies.get(REFRESH_COOKIE)
    service = AuthService(session)
    await service.logout(refresh_token=refresh_token)
    clear_auth_cookies(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get(
    "/me",
    response_model=CurrentUser,
    summary="Perfil do usuário autenticado",
)
async def me(user: CurrentUserDep) -> CurrentUser:
    return CurrentUser.model_validate(user)


def _client_ip(request: Request) -> str | None:
    """Extrai IP respeitando X-Forwarded-For (Caddy injeta)."""
    fwd = request.headers.get("X-Forwarded-For")
    if fwd:
        return fwd.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None
