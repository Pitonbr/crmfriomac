"""Feature Engineering — extrai atributos numéricos de leads e observações.

O vetor de features é o contrato estável entre os dados brutos e os modelos.
Qualquer mudança nos atributos deve ser versionada (novo campo = nova versão).

Versão atual: v1 — 25 atributos.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone

# ── Grupos de palavras-chave (sinais de intenção) ────────────────

_KW_ALTA_INTENCAO = {
    "fechamento imediato", "vamos fechar", "quero fechar", "quer fechar",
    "vou fechar", "fechar hoje", "fechar amanhã", "interesse imediato",
    "muito interessado", "gostamos muito", "adorei", "adoramos",
}

_KW_NEGOCIACAO_ATIVA = {
    "desconto", "condições especiais", "negociando", "pode dar desconto",
    "condições de pagamento", "forma de pagamento", "negociação",
    "revisão do projeto", "ajuste no orçamento", "proposta ajustada",
}

_KW_PROJETO_APROVADO = {
    "aprovamos o projeto", "aprovamos o orçamento", "aprovamos",
    "aprovei o orçamento", "aprovei", "aprovado", "aprovamos",
    "assinamos", "pedido aprovado", "contrato assinado", "assinatura",
}

_KW_URGENCIA = {
    "urgente", "precisa para", "prazo urgente", "entrega em até 60 dias",
    "obra pronta", "pronto para instalar", "obra pronta em",
    "visita de fechamento", "reunião de fechamento", "visita para negociação",
}

_KW_NEGATIVO = {
    "sem previsão", "aguardando aprovação interna", "sem retorno",
    "não retornou", "sumiu", "não atende", "muito caro",
    "fora do orçamento", "não aprovamos", "não aprovado", "recusamos",
    "cancelar", "desistiu", "cancelado", "não tem interesse",
    "perdemos", "outro fornecedor", "concorrente",
}

# Pesos para o score contínuo (kw_score_total)
_KW_WEIGHTS = {
    "alta_intencao": 20.0,
    "negociacao_ativa": 8.0,
    "projeto_aprovado": 15.0,
    "urgencia": 10.0,
    "negativo": -20.0,
}


@dataclass
class LeadFeatures:
    """Vetor de atributos extraído de um lead para uso em modelos ML.

    Todos os campos são numéricos (float ou int) para compatibilidade
    direta com scikit-learn e outros frameworks.
    """

    # ── Estruturais do lead ──────────────────────────────────────
    stage_prob_pct: float       # Probabilidade base do stage (0-100)
    stage_ordem: int            # Posição no funil (1-10+)
    valor_log: float            # log1p(valor) — normaliza distribuição
    dias_aberto: int            # Dias desde data_abertura
    dias_sem_movimento: int     # Dias desde data_ultima_movimentacao
    prioridade_score: int       # alta=3, media=2, baixa=1

    # ── Status de projeto ────────────────────────────────────────
    projeto_2d_enviado: int     # 0/1
    projeto_3d_enviado: int     # 0/1
    ambos_projetos: int         # 0/1 — ambos 2D e 3D enviados
    tem_contato_recente: int    # 0/1 — contato nos últimos 14 dias
    dias_desde_contato: int     # dias (999 se nunca houve contato)

    # ── Comercial ────────────────────────────────────────────────
    tem_entrada: int            # 0/1 — valor_entrada definido
    tem_forma_pagamento: int    # 0/1 — forma_pagamento definida
    canal_representante: int    # 0/1 — canal = representante externo

    # ── Keywords / NLP léxico ────────────────────────────────────
    kw_alta_intencao: int       # 0/1 — detectou intenção de fechar
    kw_negociacao_ativa: int    # 0/1 — sinal de negociação em andamento
    kw_projeto_aprovado: int    # 0/1 — projeto/orçamento aprovado
    kw_urgencia: int            # 0/1 — urgência ou obra pronta
    kw_negativo: int            # 0/1 — sinal negativo/cancelamento
    kw_score_total: float       # Soma ponderada contínua de todos sinais

    # ── Atividade ────────────────────────────────────────────────
    qtd_observacoes: int        # Total de obs. no histórico
    obs_ultimos_30d: int        # Obs. nos últimos 30 dias
    tem_obs_recente: int        # 0/1 — atividade nos últimos 7 dias

    # ── Ajuste manual (override) ─────────────────────────────────
    probabilidade_manual: float # valor de probabilidade_override (0 se ausente)

    def to_numpy_row(self) -> list[float]:
        """Converte para lista de floats — entrada para sklearn."""
        return [float(v) for v in asdict(self).values()]

    @classmethod
    def feature_names(cls) -> list[str]:
        """Nomes dos atributos na mesma ordem que to_numpy_row()."""
        return list(cls.__dataclass_fields__.keys())


def extract(
    *,
    stage_prob_pct: int,
    stage_ordem: int,
    valor: float,
    data_abertura: datetime,
    data_ultima_movimentacao: datetime,
    prioridade: str,
    projeto_2d_enviado: bool,
    projeto_3d_enviado: bool,
    data_ultimo_contato: datetime | None,
    valor_entrada: float | None,
    forma_pagamento: str | None,
    canal_representante: bool,
    probabilidade_override: float | None,
    obs_texts: list[str],
    obs_timestamps: list[datetime],
) -> LeadFeatures:
    """Extrai o vetor de features para um lead.

    Args:
        stage_prob_pct:       probabilidade base do estágio (stage.prob_pct)
        stage_ordem:          posição no funil (stage.ordem)
        valor:                valor do orçamento em R$
        data_abertura:        quando o lead foi aberto
        data_ultima_movimentacao: última atividade
        prioridade:           'alta' | 'media' | 'baixa'
        projeto_2d_enviado:   projeto 2D foi enviado
        projeto_3d_enviado:   projeto 3D foi enviado
        data_ultimo_contato:  None se nunca houve contato
        valor_entrada:        valor de entrada/sinal (None se não definido)
        forma_pagamento:      forma de pagamento (None se não definida)
        canal_representante:  True se canal == representante externo
        probabilidade_override: ajuste manual do usuário (None se não definido)
        obs_texts:            textos das últimas N observações (mais recentes primeiro)
        obs_timestamps:       timestamps correspondentes das observações
    """
    now = datetime.now(tz=timezone.utc)

    def _days_since(dt: datetime) -> int:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return max(0, (now - dt).days)

    dias_aberto = _days_since(data_abertura)
    dias_sem_movimento = _days_since(data_ultima_movimentacao)

    # Contato recente
    if data_ultimo_contato is not None:
        dias_contato = _days_since(data_ultimo_contato)
        tem_contato_recente = int(dias_contato <= 14)
    else:
        dias_contato = 999
        tem_contato_recente = 0

    prioridade_map = {"alta": 3, "media": 2, "médio": 2, "media": 2, "baixa": 1}
    prioridade_score = prioridade_map.get(prioridade.lower(), 2)

    # Análise de keywords nas observações
    all_text = " ".join(obs_texts).lower()
    kw_alta = int(any(kw in all_text for kw in _KW_ALTA_INTENCAO))
    kw_neg_ativa = int(any(kw in all_text for kw in _KW_NEGOCIACAO_ATIVA))
    kw_aprov = int(any(kw in all_text for kw in _KW_PROJETO_APROVADO))
    kw_urg = int(any(kw in all_text for kw in _KW_URGENCIA))
    kw_neg = int(any(kw in all_text for kw in _KW_NEGATIVO))

    kw_score = (
        kw_alta * _KW_WEIGHTS["alta_intencao"] +
        kw_neg_ativa * _KW_WEIGHTS["negociacao_ativa"] +
        kw_aprov * _KW_WEIGHTS["projeto_aprovado"] +
        kw_urg * _KW_WEIGHTS["urgencia"] +
        kw_neg * _KW_WEIGHTS["negativo"]
    )

    # Atividade de observações
    seven_days_ago = now.replace(tzinfo=timezone.utc) if now.tzinfo else now
    cutoff_7 = datetime.now(tz=timezone.utc).timestamp() - 7 * 86400
    cutoff_30 = datetime.now(tz=timezone.utc).timestamp() - 30 * 86400

    obs_30d = sum(
        1 for ts in obs_timestamps
        if (ts.replace(tzinfo=timezone.utc) if ts.tzinfo is None else ts).timestamp() >= cutoff_30
    )
    tem_obs_recente = int(
        any(
            (ts.replace(tzinfo=timezone.utc) if ts.tzinfo is None else ts).timestamp() >= cutoff_7
            for ts in obs_timestamps
        )
    )

    return LeadFeatures(
        stage_prob_pct=float(stage_prob_pct),
        stage_ordem=int(stage_ordem),
        valor_log=math.log1p(max(0.0, float(valor))),
        dias_aberto=dias_aberto,
        dias_sem_movimento=dias_sem_movimento,
        prioridade_score=prioridade_score,
        projeto_2d_enviado=int(projeto_2d_enviado),
        projeto_3d_enviado=int(projeto_3d_enviado),
        ambos_projetos=int(projeto_2d_enviado and projeto_3d_enviado),
        tem_contato_recente=tem_contato_recente,
        dias_desde_contato=dias_contato,
        tem_entrada=int(bool(valor_entrada and float(valor_entrada) > 0)),
        tem_forma_pagamento=int(bool(forma_pagamento)),
        canal_representante=int(canal_representante),
        kw_alta_intencao=kw_alta,
        kw_negociacao_ativa=kw_neg_ativa,
        kw_projeto_aprovado=kw_aprov,
        kw_urgencia=kw_urg,
        kw_negativo=kw_neg,
        kw_score_total=kw_score,
        qtd_observacoes=len(obs_texts),
        obs_ultimos_30d=obs_30d,
        tem_obs_recente=tem_obs_recente,
        probabilidade_manual=float(probabilidade_override) if probabilidade_override else 0.0,
    )
