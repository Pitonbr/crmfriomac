"""Schemas Pydantic para autenticação."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

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
    # True = frontend obriga troca de senha (rota /change-password)
    senha_provisoria: bool = False


class LoginResponse(BaseModel):
    """Cookies HttpOnly carregam os tokens. Response apenas espelha o user."""

    user: CurrentUser


class ChangePasswordRequest(BaseModel):
    """Trocar senha — exige a senha atual + nova senha forte."""

    senha_atual: str = Field(min_length=1, max_length=128)
    senha_nova: str = Field(min_length=8, max_length=128)
    senha_confirmacao: str = Field(min_length=1, max_length=128)

    @field_validator("senha_nova")
    @classmethod
    def validate_strength(cls, v: str) -> str:
        """Mínimo: 8 caracteres + ao menos 1 letra + 1 número."""
        if len(v) < 8:
            raise ValueError("senha deve ter ao menos 8 caracteres")
        if not any(c.isalpha() for c in v):
            raise ValueError("senha deve ter ao menos 1 letra")
        if not any(c.isdigit() for c in v):
            raise ValueError("senha deve ter ao menos 1 número")
        return v
