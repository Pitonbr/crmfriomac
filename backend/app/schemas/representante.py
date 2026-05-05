"""Schemas Pydantic para Representantes."""

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.representante import CanalRepresentante


class RepresentanteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID | None = None
    nome: str
    canal: CanalRepresentante
    comissao_pct: Decimal
    cidade: str | None = None
    estado: str | None = None
    email: str | None = None
    telefone: str | None = None
    ativo: bool


class RepresentanteCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=200)
    canal: CanalRepresentante
    comissao_pct: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    cidade: str | None = None
    estado: str | None = Field(default=None, max_length=2)
    email: EmailStr | None = None
    telefone: str | None = None
    user_id: UUID | None = None


class RepresentanteUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=200)
    canal: CanalRepresentante | None = None
    comissao_pct: Decimal | None = Field(default=None, ge=0, le=100)
    cidade: str | None = None
    estado: str | None = Field(default=None, max_length=2)
    email: EmailStr | None = None
    telefone: str | None = None
    ativo: bool | None = None
