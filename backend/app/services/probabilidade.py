"""Serviço de cálculo de Probabilidade de Fechamento.

Algoritmo analítico que combina:
1. Probabilidade base do stage no funil (stage.prob_pct)
2. Boost/penalidade por palavras-chave detectadas nas observações
3. Boost por status do projeto (2D/3D enviados)
4. Penalidade temporal (inatividade)
5. Ajuste manual (probabilidade_override do lead — somado ao cálculo)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal

from app.models.lead import Lead


# ── Palavras-chave de alto impacto positivo ───────────────────────
KEYWORDS_BOOST: dict[str, float] = {
    # Alta intenção de fechamento imediato (+20)
    "fechamento imediato": 20.0,
    "vamos fechar": 20.0,
    "quero fechar": 20.0,
    "quer fechar": 20.0,
    "vou fechar": 20.0,
    "fechar hoje": 20.0,
    "fechar amanhã": 18.0,
    # Interesse e aprovação explícita (+15)
    "interesse imediato": 15.0,
    "muito interessado": 15.0,
    "gostamos muito": 15.0,
    "adorei": 15.0,
    "adoramos": 15.0,
    "aprovamos o projeto": 15.0,
    "aprovamos o orçamento": 15.0,
    "aprovamos": 12.0,
    # Prontidão para instalação/entrega (+15)
    "obra pronta": 15.0,
    "pronto para instalar": 15.0,
    "assinamos": 15.0,
    "pedido aprovado": 15.0,
    "contrato assinado": 18.0,
    # Visita de fechamento marcada (+12)
    "visita para negociação": 12.0,
    "visita de fechamento": 12.0,
    "reunião de fechamento": 12.0,
    "marcamos visita": 12.0,
    "visita marcada para fechar": 14.0,
    # Negociação avançada e ajustes (+10)
    "revisão do projeto": 10.0,
    "ajuste no orçamento": 10.0,
    "aprovei o orçamento": 10.0,
    "assinatura": 10.0,
    "entrega em até 60 dias": 10.0,
    "prazo urgente": 10.0,
    "obra pronta em": 10.0,
    "aprovei": 10.0,
    "aprovado": 10.0,
    # Sinais de desconto e negociação ativa (+8)
    "desconto": 8.0,
    "condições especiais": 8.0,
    "negociando": 8.0,
    "pode dar desconto": 8.0,
    "urgente": 8.0,
    "precisa para": 8.0,
    "fechando em breve": 12.0,
    # Sinais gerais de avanço (+6)
    "condições de pagamento": 6.0,
    "forma de pagamento": 6.0,
    "enviamos o contrato": 14.0,
    "proposta aceita": 14.0,
}

# ── Palavras-chave negativas ──────────────────────────────────────
KEYWORDS_PENALTY: dict[str, float] = {
    "sem previsão": -10.0,
    "aguardando aprovação interna": -10.0,
    "sem retorno": -8.0,
    "não retornou": -8.0,
    "sumiu": -12.0,
    "não atende": -8.0,
    "muito caro": -20.0,
    "fora do orçamento": -20.0,
    "não aprovamos": -20.0,
    "não aprovado": -20.0,
    "recusamos": -20.0,
    "cancelar": -25.0,
    "desistiu": -25.0,
    "cancelado": -25.0,
    "não tem interesse": -25.0,
    "perdemos": -15.0,
    "perdeu o interesse": -20.0,
    "outro fornecedor": -18.0,
    "concorrente": -10.0,
}

_BOOST_CAP = 35.0
_PENALTY_CAP = -40.0


@dataclass
class ProbabilidadeDetalhe:
    probabilidade_calculada: float
    probabilidade_base: float
    boost_keywords: float
    boost_projeto: float
    penalidade_tempo: float
    ajuste_manual: float
    keywords_encontradas: list[str] = field(default_factory=list)


def calcular_probabilidade(
    lead: Lead,
    stage_prob_pct: int,
    obs_texts: list[str],
    probabilidade_override: Decimal | None,
) -> ProbabilidadeDetalhe:
    """Calcula a probabilidade de fechamento de um lead.

    Args:
        lead: objeto Lead com campos de projeto e timestamps
        stage_prob_pct: probabilidade base do estágio atual (0-100)
        obs_texts: textos das últimas N observações do lead
        probabilidade_override: ajuste manual (somado ao cálculo automático)
    """
    base = float(stage_prob_pct)
    all_text = " ".join(obs_texts).lower()

    # 1. Boost por palavras-chave positivas (cap +35)
    kw_boost = 0.0
    found_keywords: list[str] = []
    for kw, val in KEYWORDS_BOOST.items():
        if kw in all_text:
            kw_boost += val
            found_keywords.append(kw)
    kw_boost = min(kw_boost, _BOOST_CAP)

    # 2. Penalidade por palavras-chave negativas (cap -40)
    kw_penalty = 0.0
    for kw, val in KEYWORDS_PENALTY.items():
        if kw in all_text:
            kw_penalty += val
    kw_penalty = max(kw_penalty, _PENALTY_CAP)

    kw_total = kw_boost + kw_penalty

    # 3. Boost por projeto 2D/3D enviado
    proj_boost = 0.0
    if lead.projeto_2d_enviado and lead.projeto_3d_enviado:
        proj_boost = 12.0
    elif lead.projeto_3d_enviado:
        proj_boost = 8.0
    elif lead.projeto_2d_enviado:
        proj_boost = 5.0

    # 4. Penalidade temporal por inatividade
    ref = lead.data_ultima_movimentacao
    if ref.tzinfo is None:
        ref = ref.replace(tzinfo=timezone.utc)
    days_inactive = (datetime.now(tz=timezone.utc) - ref).days
    if days_inactive <= 7:
        temporal = 0.0
    elif days_inactive <= 14:
        temporal = -3.0
    elif days_inactive <= 30:
        temporal = -8.0
    elif days_inactive <= 60:
        temporal = -15.0
    else:
        temporal = -25.0

    # 5. Ajuste manual (probabilidade_override = ADICIONAL ao automático)
    manual_adj = float(probabilidade_override) if probabilidade_override else 0.0

    raw = base + kw_total + proj_boost + temporal + manual_adj
    final = min(95.0, max(0.0, raw))

    return ProbabilidadeDetalhe(
        probabilidade_calculada=round(final, 1),
        probabilidade_base=base,
        boost_keywords=round(kw_total, 1),
        boost_projeto=proj_boost,
        penalidade_tempo=temporal,
        ajuste_manual=manual_adj,
        keywords_encontradas=found_keywords,
    )
