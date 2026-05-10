"""Schemas Pydantic para Clientes."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ClienteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    razao_social: str | None = None
    nome_fantasia: str
    nome_contato: str | None = None
    cnpj: str | None = None
    email: str | None = None
    telefone: str | None = None
    cidade: str | None = None
    estado: str | None = None
    segmento: str | None = None
    canal: str | None = None
    observacoes: str | None = None
    ativo: bool
    criado_em: datetime | None = None


class ClienteCreate(BaseModel):
    razao_social: str | None = None
    nome_fantasia: str = Field(min_length=1, max_length=255)
    nome_contato: str | None = None
    cnpj: str | None = None
    email: EmailStr | None = None
    telefone: str | None = None
    cidade: str | None = None
    estado: str | None = Field(default=None, max_length=2)
    segmento: str | None = None
    canal: str | None = None
    observacoes: str | None = None


class ClienteUpdate(BaseModel):
    razao_social: str | None = None
    nome_fantasia: str | None = Field(default=None, min_length=1, max_length=255)
    nome_contato: str | None = None
    cnpj: str | None = None
    email: EmailStr | None = None
    telefone: str | None = None
    cidade: str | None = None
    estado: str | None = Field(default=None, max_length=2)
    segmento: str | None = None
    canal: str | None = None
    observacoes: str | None = None
    ativo: bool | None = None
