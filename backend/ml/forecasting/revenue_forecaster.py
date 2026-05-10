"""Previsão de Receita — projeta faturamento futuro com base em probabilidades.

Metodologia:
  E[receita] = Σ P(fechar_lead_i) × valor_lead_i

A distribuição temporal usa a média histórica de dias até fechamento
por estágio. Quando não há histórico suficiente, usa valores padrão
baseados no conhecimento de negócio Friomac.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from decimal import Decimal

log = logging.getLogger(__name__)

# Dias médios para fechamento por slug de stage (valores de referência Friomac)
# Estes valores são atualizados automaticamente quando há dados suficientes
_DEFAULT_DAYS_TO_CLOSE: dict[str, float] = {
    "novo_lead":     120.0,
    "visita_loco":    90.0,
    "orcamento_env":  60.0,
    "negociacao":     45.0,
    "follow_up":      75.0,
    "pre_projeto":    30.0,
    "visita_fech":    20.0,
    "contrato_env":   10.0,
    "decisao_final":   5.0,
    "reativacao":    150.0,
}
_FALLBACK_DAYS = 60.0


@dataclass
class ForecastBucket:
    """Bucket de probabilidade para breakdown da previsão."""
    range_label: str
    qtd_leads: int
    valor_esperado: float
    valor_pipeline: float


@dataclass
class RevenueForecast:
    """Resultado da previsão de receita."""
    total_esperado_30d: float
    total_esperado_90d: float
    total_esperado_12m: float
    total_pipeline: float          # soma dos valores sem ponderação
    n_leads_considerados: int
    confianca: str                 # "baixa" | "media" | "alta"
    breakdown_por_probabilidade: list[ForecastBucket]
    breakdown_por_periodo: dict    # {"30d": {...}, "90d": {...}, "12m": {...}}


@dataclass
class LeadForecastInput:
    """Dados mínimos de um lead para a previsão de receita."""
    lead_id: str
    valor: Decimal
    probabilidade: float           # 0-100
    stage_slug: str
    days_in_stage: int = 0


def forecast(
    leads: list[LeadForecastInput],
    days_to_close_by_stage: dict[str, float] | None = None,
) -> RevenueForecast:
    """Calcula previsão de receita para os próximos 30d, 90d e 12m.

    Args:
        leads: lista de leads ativos com probabilidade calculada
        days_to_close_by_stage: média histórica de dias para fechar por stage
                                (se None, usa valores padrão Friomac)

    Returns:
        RevenueForecast com previsões por período e breakdown por probabilidade
    """
    if not leads:
        return _empty_forecast()

    dtc = days_to_close_by_stage or _DEFAULT_DAYS_TO_CLOSE

    total_30d = 0.0
    total_90d = 0.0
    total_12m = 0.0
    total_pipeline = 0.0

    # Buckets de probabilidade para breakdown
    buckets: dict[str, tuple[int, float, float]] = {
        "90_95": (0, 0.0, 0.0),
        "70_90": (0, 0.0, 0.0),
        "60_70": (0, 0.0, 0.0),
        "50_60": (0, 0.0, 0.0),
        "0_50":  (0, 0.0, 0.0),
    }

    for lead in leads:
        prob_frac = lead.probabilidade / 100.0
        expected = prob_frac * float(lead.valor)
        total_pipeline += float(lead.valor)

        # Estima dias até fechamento para este lead
        days_left = max(0.0, dtc.get(lead.stage_slug, _FALLBACK_DAYS) - lead.days_in_stage)

        if days_left <= 30:
            total_30d += expected
        if days_left <= 90:
            total_90d += expected
        total_12m += expected  # todos os leads são esperados em 12 meses

        # Classifica em bucket
        p = lead.probabilidade
        if p >= 90:
            bk = "90_95"
        elif p >= 70:
            bk = "70_90"
        elif p >= 60:
            bk = "60_70"
        elif p >= 50:
            bk = "50_60"
        else:
            bk = "0_50"
        qtd, ev, pv = buckets[bk]
        buckets[bk] = (qtd + 1, ev + expected, pv + float(lead.valor))

    # Determina confiança com base no número de leads com alta probabilidade
    n_hot = sum(1 for l in leads if l.probabilidade >= 70)
    confianca = "alta" if n_hot >= 5 else "media" if n_hot >= 2 else "baixa"

    forecast_buckets = [
        ForecastBucket(
            range_label=k,
            qtd_leads=v[0],
            valor_esperado=round(v[1], 2),
            valor_pipeline=round(v[2], 2),
        )
        for k, v in buckets.items()
        if v[0] > 0
    ]

    return RevenueForecast(
        total_esperado_30d=round(total_30d, 2),
        total_esperado_90d=round(total_90d, 2),
        total_esperado_12m=round(total_12m, 2),
        total_pipeline=round(total_pipeline, 2),
        n_leads_considerados=len(leads),
        confianca=confianca,
        breakdown_por_probabilidade=forecast_buckets,
        breakdown_por_periodo={
            "30d": {"valor": round(total_30d, 2), "desc": "Fechamentos esperados em 30 dias"},
            "90d": {"valor": round(total_90d, 2), "desc": "Fechamentos esperados em 90 dias"},
            "12m": {"valor": round(total_12m, 2), "desc": "Fechamentos esperados em 12 meses"},
        },
    )


def _empty_forecast() -> RevenueForecast:
    return RevenueForecast(
        total_esperado_30d=0.0, total_esperado_90d=0.0,
        total_esperado_12m=0.0, total_pipeline=0.0,
        n_leads_considerados=0, confianca="baixa",
        breakdown_por_probabilidade=[], breakdown_por_periodo={},
    )
