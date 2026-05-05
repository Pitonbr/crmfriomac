"""Testes dos JWTs de access e refresh."""

import time
from uuid import uuid4

import pytest

from app.security.tokens import (
    TokenError,
    decode_token,
    issue_access_token,
    issue_refresh_token,
)


def test_access_token_roundtrip() -> None:
    user_id = uuid4()
    tenant_id = uuid4()
    token, exp = issue_access_token(user_id=user_id, tenant_id=tenant_id, role="master")
    assert exp > int(time.time())

    payload = decode_token(token, expected_type="access")
    assert payload.sub == user_id
    assert payload.tenant_id == tenant_id
    assert payload.role == "master"
    assert payload.token_type == "access"


def test_refresh_token_has_jti() -> None:
    user_id = uuid4()
    tenant_id = uuid4()
    token, jti, _ = issue_refresh_token(user_id=user_id, tenant_id=tenant_id, role="vendedor")
    assert len(jti) > 0
    payload = decode_token(token, expected_type="refresh")
    assert payload.jti == jti


def test_decode_rejects_wrong_type() -> None:
    user_id = uuid4()
    tenant_id = uuid4()
    access, _ = issue_access_token(user_id=user_id, tenant_id=tenant_id, role="master")
    with pytest.raises(TokenError):
        decode_token(access, expected_type="refresh")


def test_decode_rejects_garbage() -> None:
    with pytest.raises(TokenError):
        decode_token("not-a-jwt", expected_type="access")


def test_decode_rejects_tampered_signature() -> None:
    user_id = uuid4()
    tenant_id = uuid4()
    token, _ = issue_access_token(user_id=user_id, tenant_id=tenant_id, role="master")
    tampered = token[:-4] + "XXXX"
    with pytest.raises(TokenError):
        decode_token(tampered, expected_type="access")
