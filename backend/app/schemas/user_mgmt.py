"""Schemas de gerenciamento de usuários (criação, listagem, atualização)."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    nome: str
    email: str
    telefone: str | None = None
    role: UserRole
    ativo: bool
    senha_provisoria: bool
    excluido_em: datetime | None = None
    criado_em: datetime
    atualizado_em: datetime

    @property
    def foi_excluido(self) -> bool:
        return self.excluido_em is not None


class UserCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=200)
    email: EmailStr
    telefone: str | None = Field(default=None, max_length=40)
    role: UserRole


class UserUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=200)
    email: EmailStr | None = None
    telefone: str | None = Field(default=None, max_length=40)
    role: UserRole | None = None
    ativo: bool | None = None


class UserCreatedResponse(BaseModel):
    """Retornado ao criar usuário — inclui senha provisória (exibir uma vez)."""
    user: UserOut
    senha_provisoria: str


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    user_nome: str
    user_role: str
    acao: str
    entidade: str
    entidade_id: str | None
    descricao: str
    criado_em: datetime
