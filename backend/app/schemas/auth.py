"""Schemas Pydantic para autenticação."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=1, max_length=128)
    tenant_slug: str = Field(min_length=1, max_length=64, default="friomac")


class CurrentUser(BaseModel):
    """Resposta do GET /auth/me — perfil mínimo do usuário corrente."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    nome: str
    email: EmailStr
    role: UserRole
    avatar: str | None = None
    grupo: str | None = None


class LoginResponse(BaseModel):
    """Cookies HttpOnly carregam os tokens. Response apenas espelha o user."""

    user: CurrentUser
