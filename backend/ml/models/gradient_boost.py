"""Modelo de Gradient Boosting com calibração de probabilidade.

Utiliza scikit-learn GradientBoostingClassifier envolvido em
CalibratedClassifierCV (isotonic regression) para garantir que as
probabilidades preditas sejam bem calibradas.

Exemplo de calibração:
  Se o modelo prediz 70% para um conjunto de leads,
  aproximadamente 70% desses leads devem realmente fechar.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import numpy as np

from ml.features.extractor import LeadFeatures
from ml.models.base import BaseModel, PredictionResult

if TYPE_CHECKING:
    from sklearn.calibration import CalibratedClassifierCV

log = logging.getLogger(__name__)

_MAX_PROB = 95.0
_MIN_SAMPLES_FOR_ML = 30  # Mínimo de leads fechados para usar ML


class GradientBoostModel(BaseModel):
    """Gradient Boosting calibrado para predição de fechamento.

    O modelo aprende padrões de fechamento a partir de leads históricos
    com outcome definitivo (GANHO ou PERDIDO).

    Hiperparâmetros escolhidos para evitar overfitting:
    - max_depth=4: árvores rasas, mais generalizáveis
    - min_samples_leaf=5: folhas com no mínimo 5 exemplos
    - subsample=0.8: reduz variância via amostragem por árvore
    - learning_rate=0.05: aprendizado conservador
    """

    def __init__(self) -> None:
        self._model: CalibratedClassifierCV | None = None
        self._n_training_samples: int = 0
        self._feature_importances: dict[str, float] = {}
        self._training_metrics: dict[str, float] = {}

    def fit(self, features_list: list[LeadFeatures], labels: list[int]) -> dict[str, float]:
        """Treina o modelo com dados históricos.

        Args:
            features_list: lista de LeadFeatures de leads fechados
            labels: 1=GANHO, 0=PERDIDO (mesma ordem que features_list)

        Returns:
            dict com métricas de avaliação (AUC, Brier Score, etc.)
        """
        from sklearn.calibration import CalibratedClassifierCV
        from sklearn.ensemble import GradientBoostingClassifier
        from sklearn.metrics import brier_score_loss, roc_auc_score
        from sklearn.model_selection import StratifiedKFold, cross_val_predict

        if len(features_list) < _MIN_SAMPLES_FOR_ML:
            raise ValueError(
                f"Mínimo {_MIN_SAMPLES_FOR_ML} amostras necessário. "
                f"Atual: {len(features_list)}"
            )

        X = np.array([f.to_numpy_row() for f in features_list])
        y = np.array(labels)

        # Verificar balanceamento de classes
        n_pos = y.sum()
        n_neg = len(y) - n_pos
        log.info("treino.classes", n_ganho=int(n_pos), n_perdido=int(n_neg), total=len(y))

        # Hiperparâmetros conservadores para evitar overfitting
        base_clf = GradientBoostingClassifier(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.05,
            min_samples_leaf=5,
            subsample=0.8,
            random_state=42,
        )

        # Calibração com isotonic regression (mais flexível que sigmoid)
        calibrated = CalibratedClassifierCV(
            estimator=base_clf,
            method="isotonic",
            cv=5,  # 5-fold para calibração
        )
        calibrated.fit(X, y)

        self._model = calibrated
        self._n_training_samples = len(y)

        # Métricas via cross-validation (sem data leakage)
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        y_prob_cv = cross_val_predict(
            GradientBoostingClassifier(
                n_estimators=200, max_depth=4, learning_rate=0.05,
                min_samples_leaf=5, subsample=0.8, random_state=42,
            ),
            X, y, cv=cv, method="predict_proba",
        )[:, 1]

        auc = roc_auc_score(y, y_prob_cv)
        brier = brier_score_loss(y, y_prob_cv)

        self._training_metrics = {
            "auc_roc": round(float(auc), 4),
            "brier_score": round(float(brier), 4),
            "n_samples": int(len(y)),
            "n_ganho": int(n_pos),
            "n_perdido": int(n_neg),
        }

        # Feature importances (do estimador base, não do calibrado)
        try:
            base_est = calibrated.calibrated_classifiers_[0].estimator
            importances = base_est.feature_importances_
            names = LeadFeatures.feature_names()
            self._feature_importances = {
                n: round(float(v), 4) for n, v in zip(names, importances)
            }
        except Exception:
            pass

        log.info("treino.concluido", **self._training_metrics)
        return self._training_metrics

    def predict(self, features: LeadFeatures) -> PredictionResult:
        if self._model is None:
            raise RuntimeError("Modelo não treinado. Chame .fit() primeiro.")

        X = np.array([features.to_numpy_row()])
        prob_raw = float(self._model.predict_proba(X)[0, 1])
        # Aplica cap de 95% e escala para percentual
        prob_pct = min(_MAX_PROB, max(0.0, prob_raw * 100))

        # Adiciona ajuste manual do usuário
        prob_final = min(_MAX_PROB, prob_pct + features.probabilidade_manual)

        # Confiança aumenta com mais dados de treino
        confidence = min(1.0, self._n_training_samples / 200)

        return PredictionResult(
            probability=round(prob_final, 1),
            confidence=round(confidence, 2),
            model_used="gradient_boost",
            details={
                "prob_raw_pct": round(prob_pct, 1),
                "manual_adjustment": features.probabilidade_manual,
                "n_training_samples": self._n_training_samples,
                "metrics": self._training_metrics,
            },
        )

    def predict_batch(self, features_list: list[LeadFeatures]) -> list[PredictionResult]:
        if self._model is None:
            raise RuntimeError("Modelo não treinado.")
        X = np.array([f.to_numpy_row() for f in features_list])
        probs_raw = self._model.predict_proba(X)[:, 1]
        results = []
        confidence = min(1.0, self._n_training_samples / 200)
        for f, prob_raw in zip(features_list, probs_raw):
            prob_pct = min(_MAX_PROB, max(0.0, float(prob_raw) * 100))
            prob_final = min(_MAX_PROB, prob_pct + f.probabilidade_manual)
            results.append(PredictionResult(
                probability=round(prob_final, 1),
                confidence=round(confidence, 2),
                model_used="gradient_boost",
                details={"prob_raw_pct": round(prob_pct, 1)},
            ))
        return results

    @property
    def name(self) -> str:
        return "gradient_boost_v1"

    @property
    def is_fitted(self) -> bool:
        return self._model is not None

    @property
    def n_samples(self) -> int:
        return self._n_training_samples

    @property
    def feature_importances(self) -> dict[str, float]:
        return self._feature_importances

    @property
    def metrics(self) -> dict[str, float]:
        return self._training_metrics
