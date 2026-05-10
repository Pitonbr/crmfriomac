"""Modelo Baseline de Regras — sempre disponível, totalmente interpretável.

Este modelo encapsula o algoritmo original baseado em conhecimento de negócio.
Serve como:
1. Fallback quando não há dados suficientes para treinar o modelo ML
2. Componente do ensemble (combinado com o modelo ML)
3. Referência para validar que o modelo ML está aprendendo algo útil
"""

from __future__ import annotations

from ml.features.extractor import LeadFeatures
from ml.models.base import BaseModel, PredictionResult


class RulesModel(BaseModel):
    """Modelo baseado em regras de negócio Friomac.

    Combina:
    - Probabilidade base do estágio no funil
    - Boost por palavras-chave nas observações
    - Boost por projeto 2D/3D enviado
    - Penalidade temporal por inatividade
    - Ajuste manual (probabilidade_override)
    """

    # Limites de boost/penalidade para evitar extrapolações
    _BOOST_CAP = 35.0
    _PENALTY_CAP = -40.0
    _MAX_PROB = 95.0

    def predict(self, features: LeadFeatures) -> PredictionResult:
        base = features.stage_prob_pct

        # Boost de palavras-chave
        kw_boost = 0.0
        if features.kw_alta_intencao:   kw_boost += 20.0
        if features.kw_negociacao_ativa: kw_boost += 8.0
        if features.kw_projeto_aprovado: kw_boost += 15.0
        if features.kw_urgencia:         kw_boost += 10.0
        kw_boost = min(kw_boost, self._BOOST_CAP)

        # Penalidade de keywords negativas
        kw_penalty = -20.0 if features.kw_negativo else 0.0

        # Boost de projeto 2D/3D
        if features.ambos_projetos:
            proj_boost = 12.0
        elif features.projeto_3d_enviado:
            proj_boost = 8.0
        elif features.projeto_2d_enviado:
            proj_boost = 5.0
        else:
            proj_boost = 0.0

        # Penalidade temporal
        d = features.dias_sem_movimento
        temporal = (0.0 if d <= 7 else
                    -3.0 if d <= 14 else
                    -8.0 if d <= 30 else
                    -15.0 if d <= 60 else
                    -25.0)

        # Ajuste manual do usuário (adicional ao cálculo)
        manual = features.probabilidade_manual

        raw = base + kw_boost + kw_penalty + proj_boost + temporal + manual
        prob = min(self._MAX_PROB, max(0.0, raw))

        return PredictionResult(
            probability=round(prob, 1),
            confidence=0.7,  # confiança base do modelo de regras
            model_used="rules",
            details={
                "base_stage": base,
                "kw_boost": round(kw_boost + kw_penalty, 1),
                "proj_boost": proj_boost,
                "temporal_penalty": temporal,
                "manual_adjustment": manual,
            },
        )

    def predict_batch(self, features_list: list[LeadFeatures]) -> list[PredictionResult]:
        return [self.predict(f) for f in features_list]

    @property
    def name(self) -> str:
        return "rules_v1"

    @property
    def is_fitted(self) -> bool:
        return True  # Regras não precisam de treino
