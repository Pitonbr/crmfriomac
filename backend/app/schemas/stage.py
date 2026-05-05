"""Schemas Pydantic para Stages (etapas do funil)."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class StageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    label: str
    icone: str | None = None
    sla_horas: int
    cor: str
    prob_pct: int
    ordem: int
    ativo: bool


class StageCreate(BaseModel):
    slug: str = Field(min_length=1, max_length=40)
    label: str = Field(min_length=1, max_length=80)
    icone: str | None = Field(default=None, max_length=10)
    sla_horas: int = Field(default=0, ge=0)
    cor: str = Field(min_length=1, max_length=20)
    prob_pct: int = Field(default=0, ge=0, le=100)
    ordem: int = Field(default=0, ge=0)


class StageUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=80)
    icone: str | None = None
    sla_horas: int | None = Field(default=None, ge=0)
    cor: str | None = None
    prob_pct: int | None = Field(default=None, ge=0, le=100)
    ordem: int | None = None
    ativo: bool | None = None
