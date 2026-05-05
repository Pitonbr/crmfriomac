"""SQLAlchemy models — re-exporta tudo para facilitar imports e Alembic.

Cada model novo (Sprint 3+) deve ser adicionado aqui.
"""

from app.models.auth import AuthLoginAttempt, AuthRefreshToken
from app.models.tenant import Tenant
from app.models.user import User, UserRole

__all__ = [
    "AuthLoginAttempt",
    "AuthRefreshToken",
    "Tenant",
    "User",
    "UserRole",
]
