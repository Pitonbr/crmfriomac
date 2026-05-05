"""Schemas para o Dashboard KPIs (calculados via queries SQL no service)."""

from decimal import Decimal

from pydantic import BaseModel


class FunilStage(BaseModel):
    stage_id: str
    label: str
    cor: str
    ordem: int
    qtd_leads: int
    valor_total: Decimal


class TopRep(BaseModel):
    representante_id: str
    nome: str
    qtd_leads: int
    valor_total: Decimal


class MesAgg(BaseModel):
    mes: str  # 2026-01
    qtd_orc: int
    valor_orc: Decimal
    qtd_fech: int
    valor_fech: Decimal


class DashboardKPIs(BaseModel):
    """Resposta de /api/v1/kpis/dashboard."""

    meta_anual: Decimal
    total_orcado: Decimal
    total_fechado: Decimal
    qtd_leads_abertos: int
    qtd_leads_ganhos: int
    qtd_leads_perdidos: int
    taxa_conversao: float          # %
    ticket_medio: Decimal
    valor_pipeline_ponderado: Decimal  # soma de valor * prob_pct/100
    funil: list[FunilStage]
    top_reps: list[TopRep]
    mensal: list[MesAgg]
