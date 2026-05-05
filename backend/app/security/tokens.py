"""JWT helpers — emissão e validação de access + refresh tokens.

Convenção:
- `access` token: 15 min, claims (sub, tenant_id, role, type=access).
- `refresh` token: 7 dias, claims (sub, tenant_id, jti, type=refresh).
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import UUID, uuid4

import jwt

from app.config import settings

ALGORITHM = "HS256"
TokenType = Literal["access", "refresh"]


@dataclass(frozen=True)
class TokenPayload:
    sub: UUID                 # user id
    tenant_id: UUID
    role: str
    token_type: TokenType
    jti: str | None = None    # só refresh
    exp: int = 0


class TokenError(Exception):
    """Falha de validação do token (expirado, inválido, malformado)."""


def _now_ts() -> int:
    return int(datetime.now(UTC).timestamp())


def issue_access_token(*, user_id: UUID, tenant_id: UUID, role: str) -> tuple[str, int]:
    """Retorna (token, exp_ts)."""
    exp = _now_ts() + settings.jwt_access_ttl
    payload = {
        "sub": str(user_id),
        "tenant_id": str(tenant_id),
        "role": role,
        "type": "access",
        "iat": _now_ts(),
        "exp": exp,
    }
    return jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm=ALGORITHM), exp


def issue_refresh_token(
    *, user_id: UUID, tenant_id: UUID, role: str
) -> tuple[str, str, int]:
    """Retorna (token, jti, exp_ts).

    `jti` precisa ser persistido em `auth_refresh_tokens` para permitir revogação.
    """
    jti = uuid4().hex
    exp = _now_ts() + settings.jwt_refresh_ttl
    payload = {
        "sub": str(user_id),
        "tenant_id": str(tenant_id),
        "role": role,
        "type": "refresh",
        "jti": jti,
        "iat": _now_ts(),
        "exp": exp,
    }
    return (
        jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm=ALGORITHM),
        jti,
        exp,
    )


def decode_token(token: str, *, expected_type: TokenType) -> TokenPayload:
    """Valida assinatura, expiração e tipo. Lança TokenError em qualquer falha."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=[ALGORITHM],
        )
    except jwt.ExpiredSignatureError as e:
        raise TokenError("token expirado") from e
    except jwt.InvalidTokenError as e:
        raise TokenError("token inválido") from e

    if payload.get("type") != expected_type:
        raise TokenError(f"esperado type={expected_type}, recebeu {payload.get('type')!r}")

    try:
        return TokenPayload(
            sub=UUID(payload["sub"]),
            tenant_id=UUID(payload["tenant_id"]),
            role=payload["role"],
            token_type=expected_type,
            jti=payload.get("jti"),
            exp=int(payload.get("exp", 0)),
        )
    except (KeyError, ValueError) as e:
        raise TokenError("payload malformado") from e


def refresh_expiry() -> datetime:
    """Helper: data de expiração para persistir em auth_refresh_tokens."""
    return datetime.now(UTC) + timedelta(seconds=settings.jwt_refresh_ttl)
