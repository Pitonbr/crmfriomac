"""Testes de integração dos endpoints /api/v1/auth/*."""

import pytest
from httpx import AsyncClient

from app.models.user import User
from app.security.cookies import ACCESS_COOKIE, REFRESH_COOKIE


@pytest.mark.asyncio
@pytest.mark.integration
async def test_login_success_sets_cookies(
    client: AsyncClient, admin_user: tuple[User, str]
) -> None:
    user, senha = admin_user
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "senha": senha, "tenant_slug": "friomac"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == user.email
    assert body["user"]["role"] == "master"

    # Cookies HttpOnly setados
    set_cookies = response.headers.get_list("set-cookie")
    cookie_str = " ".join(set_cookies)
    assert ACCESS_COOKIE in cookie_str
    assert REFRESH_COOKIE in cookie_str
    assert "HttpOnly" in cookie_str


@pytest.mark.asyncio
@pytest.mark.integration
async def test_login_wrong_password_returns_401(
    client: AsyncClient, admin_user: tuple[User, str]
) -> None:
    user, _ = admin_user
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "senha": "errado", "tenant_slug": "friomac"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.integration
async def test_login_unknown_tenant_returns_401(
    client: AsyncClient, admin_user: tuple[User, str]
) -> None:
    user, senha = admin_user
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "senha": senha, "tenant_slug": "outra-empresa"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.integration
async def test_me_requires_authentication(client: AsyncClient) -> None:
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.integration
async def test_me_returns_current_user(
    client: AsyncClient, admin_user: tuple[User, str]
) -> None:
    user, senha = admin_user
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "senha": senha, "tenant_slug": "friomac"},
    )
    assert login.status_code == 200

    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == user.email
    assert body["role"] == "master"
    assert body["tenant_id"] == str(user.tenant_id)


@pytest.mark.asyncio
@pytest.mark.integration
async def test_refresh_rotates_token(
    client: AsyncClient, admin_user: tuple[User, str]
) -> None:
    user, senha = admin_user
    await client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "senha": senha, "tenant_slug": "friomac"},
    )
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 200
    assert response.json()["user"]["email"] == user.email


@pytest.mark.asyncio
@pytest.mark.integration
async def test_refresh_without_cookie_fails(client: AsyncClient) -> None:
    response = await client.post("/api/v1/auth/refresh")
    assert response.status_code == 401


@pytest.mark.asyncio
@pytest.mark.integration
async def test_logout_clears_cookies(
    client: AsyncClient, admin_user: tuple[User, str]
) -> None:
    user, senha = admin_user
    await client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "senha": senha, "tenant_slug": "friomac"},
    )
    response = await client.post("/api/v1/auth/logout")
    assert response.status_code == 204

    # Após logout, /me deve falhar
    me_response = await client.get("/api/v1/auth/me")
    assert me_response.status_code == 401
