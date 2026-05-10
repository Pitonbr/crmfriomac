"""Contrato base para todos os modelos de probabilidade de fechamento."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from ml.features.extractor import LeadFeatures


@dataclass
class PredictionResult:
    """Resultado de uma predição de probabilidade de fechamento."""
    probability: float          # Probabilidade final [0-95]
    confidence: float           # Confiança na predição [0-1]
    model_used: str             # "rules" | "ml" | "ensemble"
    details: dict               # Detalhes específicos do modelo


class BaseModel(ABC):
    """Interface que todo modelo de probabilidade deve implementar."""

    @abstractmethod
    def predict(self, features: LeadFeatures) -> PredictionResult:
        """Prediz probabilidade de fechamento para um único lead."""
        ...

    @abstractmethod
    def predict_batch(self, features_list: list[LeadFeatures]) -> list[PredictionResult]:
        """Prediz para múltiplos leads (mais eficiente que loop)."""
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        """Nome identificador do modelo."""
        ...

    @property
    @abstractmethod
    def is_fitted(self) -> bool:
        """True se o modelo está pronto para fazer predições."""
        ...
