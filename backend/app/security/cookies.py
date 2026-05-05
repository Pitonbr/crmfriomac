"""Helpers para set/clear de cookies HttpOnly de auth.

Convenção:
- `friomac_access`: cookie do access token (Path=/, expira em 15min).
- `friomac_refresh`: cookie do refresh token (Path=/api/v1/auth, expira em 7d).

Path do refresh é restrito para reduzir superfície (só vai em /refresh, /logout).
"""

from fastapi import Response

from app.config import settings

ACCESS_COOKIE = "friomac_access"
REFRESH_COOKIE = "friomac_refresh"
REFRESH_PATH = "/api/v1/auth"


def set_access_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=ACCESS_COOKIE,
        value=token,
        max_age=settings.jwt_access_ttl,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain if settings.cookie_domain != "localhost" else None,
        path="/",
    )


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        max_age=settings.jwt_refresh_ttl,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain if settings.cookie_domain != "localhost" else None,
        path=REFRESH_PATH,
    )


def clear_auth_cookies(response: Response) -> None:
    """Remove cookies em logout. Tem que match path/domain do set."""
    response.delete_cookie(
        ACCESS_COOKIE,
        path="/",
        domain=settings.cookie_domain if settings.cookie_domain != "localhost" else None,
    )
    response.delete_cookie(
        REFRESH_COOKIE,
        path=REFRESH_PATH,
        domain=settings.cookie_domain if settings.cookie_domain != "localhost" else None,
    )
