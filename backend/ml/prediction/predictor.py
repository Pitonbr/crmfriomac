"""Interface unificada de predição — ensemble de regras + ML.

A confiança no modelo ML aumenta gradualmente com o tamanho do
conjunto de treinamento, garantindo transição suave e sem alucinações.

Ciclo de vida:
  - 0-29 amostras: 100% modelo de regras (α=0)
  - 30-229 amostras: ensemble gradual (0 < α < 1)
  - 230+ amostras: 100% modelo ML calibrado (α=1)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from ml.features.extractor import LeadFeatures
from ml.models.base import PredictionResult
from ml.models.gradient_boost import GradientBoostModel
from ml.models.rules import RulesModel
from ml.store.model_store import ModelStore

log = logging.getLogger(__name__)

_ALPHA_MIN_SAMPLES = 30    # começa a usar ML
_ALPHA_MAX_SAMPLES = 230   # confia 100% no ML
_MAX_PROB = 95.0


@dataclass
class EnsemblePrediction:
    probability: float          # [0–95]
    alpha: float                # peso do ML no ensemble [0-1]
    ml_prob: float | None       # prob do ML (None se não disponível)
    rules_prob: float           # prob do modelo de regras
    model_used: str             # "rules" | "ensemble" | "ml"
    n_training_samples: int     # qtd de leads no treino
    details: dict               # detalhes adicionais


class Predictor:
    """Facade que combina RulesModel e GradientBoostModel de forma inteligente."""

    def __init__(self, store: ModelStore | None = None) -> None:
        self._store = store or ModelStore()
        self._rules = RulesModel()
        self._ml: GradientBoostModel | None = None
        self._n_train = 0
        self._loaded = False

    def _ensure_loaded(self) -> None:
        """Carrega modelo do disco se ainda não foi carregado."""
        if self._loaded:
            return
        self._loaded = True
        model = self._store.load()
        if isinstance(model, GradientBoostModel) and model.is_fitted:
            self._ml = model
            self._n_train = model.n_samples
            log.info("predictor.ml_loaded", n_samples=self._n_train)
        else:
            log.info("predictor.ml_unavailable", reason="no fitted model on disk")

    def predict(self, features: LeadFeatures) -> EnsemblePrediction:
        self._ensure_loaded()

        rules_result: PredictionResult = self._rules.predict(features)
        rules_prob = rules_result.probability

        # Calcula alpha (peso do ML no ensemble)
        alpha = _calc_alpha(self._n_train)

        if alpha <= 0.0 or self._ml is None:
            return EnsemblePrediction(
                probability=round(rules_prob, 1),
                alpha=0.0,
                ml_prob=None,
                rules_prob=rules_prob,
                model_used="rules",
                n_training_samples=self._n_train,
                details=rules_result.details,
            )

        ml_result: PredictionResult = self._ml.predict(features)
        ml_prob = ml_result.probability

        # Ensemble ponderado
        ensemble_prob = alpha * ml_prob + (1.0 - alpha) * rules_prob
        ensemble_prob = min(_MAX_PROB, max(0.0, ensemble_prob))

        model_label = "ml" if alpha >= 0.99 else "ensemble"

        return EnsemblePrediction(
            probability=round(ensemble_prob, 1),
            alpha=round(alpha, 2),
            ml_prob=round(ml_prob, 1),
            rules_prob=round(rules_prob, 1),
            model_used=model_label,
            n_training_samples=self._n_train,
            details={**rules_result.details, "ml_details": ml_result.details},
        )

    def predict_batch(self, features_list: list[LeadFeatures]) -> list[EnsemblePrediction]:
        return [self.predict(f) for f in features_list]

    def reload(self) -> None:
        """Força recarga do modelo do disco (após retreinamento)."""
        self._loaded = False
        self._ml = None
        self._n_train = 0
        self._ensure_loaded()

    @property
    def status(self) -> dict:
        self._ensure_loaded()
        meta = self._store.get_metadata()
        alpha = _calc_alpha(self._n_train)
        return {
            "ml_available": self._ml is not None,
            "n_training_samples": self._n_train,
            "alpha_ml": round(alpha, 2),
            "model_active": "ml" if alpha >= 0.99 else ("ensemble" if alpha > 0 else "rules"),
            "ml_metadata": meta,
        }


def _calc_alpha(n_samples: int) -> float:
    """Calcula peso do ML no ensemble em função do tamanho do treino."""
    if n_samples < _ALPHA_MIN_SAMPLES:
        return 0.0
    return min(1.0, (n_samples - _ALPHA_MIN_SAMPLES) / (_ALPHA_MAX_SAMPLES - _ALPHA_MIN_SAMPLES))


# ── Instância global (singleton) ─────────────────────────────────
_global_predictor: Predictor | None = None


def get_predictor() -> Predictor:
    """Retorna o predictor global (lazy loading)."""
    global _global_predictor
    if _global_predictor is None:
        _global_predictor = Predictor()
    return _global_predictor
