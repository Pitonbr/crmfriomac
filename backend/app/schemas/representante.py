"""Schemas Pydantic para Representantes — 5 abas: Identificação, Contato, Financeiro, Redes Sociais, Documentos."""

from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.representante import CanalRepresentante


class RepresentanteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID | None = None

    # Identificação
    nome: str
    nome_fantasia: str | None = None
    razao_social: str | None = None
    cnpj: str | None = None
    canal: CanalRepresentante
    comissao_pct: Decimal

    # Contato
    email: str | None = None
    telefone: str | None = None
    endereco: str | None = None
    cep: str | None = None
    cidade: str | None = None
    estado: str | None = None

    # Financeiro
    banco: str | None = None
    agencia: str | None = None
    conta: str | None = None
    pix: str | None = None
    obs_financeiro: str | None = None

    # Redes Sociais
    instagram: str | None = None
    linkedin: str | None = None
    tiktok: str | None = None
    website: str | None = None
    outras_redes: str | None = None

    ativo: bool


class RepresentanteCreate(BaseModel):
    # Identificação
    nome: str = Field(min_length=1, max_length=200)
    nome_fantasia: str | None = Field(default=None, max_length=200)
    razao_social: str | None = Field(default=None, max_length=200)
    cnpj: str | None = Field(default=None, max_length=20)
    canal: CanalRepresentante
    comissao_pct: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    user_id: UUID | None = None

    # Contato
    email: EmailStr | None = None
    telefone: str | None = Field(default=None, max_length=40)
    endereco: str | None = Field(default=None, max_length=255)
    cep: str | None = Field(default=None, max_length=10)
    cidade: str | None = Field(default=None, max_length=100)
    estado: str | None = Field(default=None, max_length=2)

    # Financeiro
    banco: str | None = Field(default=None, max_length=100)
    agencia: str | None = Field(default=None, max_length=20)
    conta: str | None = Field(default=None, max_length=30)
    pix: str | None = Field(default=None, max_length=100)
    obs_financeiro: str | None = None

    # Redes Sociais
    instagram: str | None = Field(default=None, max_length=100)
    linkedin: str | None = Field(default=None, max_length=200)
    tiktok: str | None = Field(default=None, max_length=100)
    website: str | None = Field(default=None, max_length=200)
    outras_redes: str | None = Field(default=None, max_length=200)


class RepresentanteUpdate(BaseModel):
    # Identificação
    nome: str | None = Field(default=None, min_length=1, max_length=200)
    nome_fantasia: str | None = Field(default=None, max_length=200)
    razao_social: str | None = Field(default=None, max_length=200)
    cnpj: str | None = Field(default=None, max_length=20)
    canal: CanalRepresentante | None = None
    comissao_pct: Decimal | None = Field(default=None, ge=0, le=100)

    # Contato
    email: EmailStr | None = None
    telefone: str | None = Field(default=None, max_length=40)
    endereco: str | None = Field(default=None, max_length=255)
    cep: str | None = Field(default=None, max_length=10)
    cidade: str | None = Field(default=None, max_length=100)
    estado: str | None = Field(default=None, max_length=2)

    # Financeiro
    banco: str | None = Field(default=None, max_length=100)
    agencia: str | None = Field(default=None, max_length=20)
    conta: str | None = Field(default=None, max_length=30)
    pix: str | None = Field(default=None, max_length=100)
    obs_financeiro: str | None = None

    # Redes Sociais
    instagram: str | None = Field(default=None, max_length=100)
    linkedin: str | None = Field(default=None, max_length=200)
    tiktok: str | None = Field(default=None, max_length=100)
    website: str | None = Field(default=None, max_length=200)
    outras_redes: str | None = Field(default=None, max_length=200)

    ativo: bool | None = None
