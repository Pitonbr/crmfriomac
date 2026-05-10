"""Pipeline de treinamento do modelo ML.

Orquestra: coleta → treino → avaliação → persistência.
Inclui validação para garantir que o novo modelo não seja pior que o atual.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from ml.models.gradient_boost import GradientBoostModel
from ml.store.model_store import ModelStore
from ml.training.collector import collect_training_data

log = logging.getLogger(__name__)

_MIN_SAMPLES       = 30    # mínimo para treinar
_MIN_AUC_TO_SAVE   = 0.60  # só salva se AUC mínima atingida
_IMPROVEMENT_DELTA = 0.01  # AUC deve melhorar pelo menos 0.01 para substituir


@dataclass
class TrainingResult:
    status: str                  # "success" | "insufficient_data" | "no_improvement" | "error"
    message: str
    metrics: dict
    n_samples: int


async def train(
    session: AsyncSession,
    store: ModelStore | None = None,
    force: bool = False,
) -> TrainingResult:
    """Executa o pipeline completo de treinamento.

    Args:
        session: sessão do banco (tenant já configurado via RLS)
        store: instância do ModelStore (cria um default se None)
        force: se True, força retraining mesmo sem melhora de AUC

    Returns:
        TrainingResult com status e métricas
    """
    if store is None:
        store = ModelStore()

    # 1. Coleta dados
    try:
        records = await collect_training_data(session)
    except Exception as e:
        log.error("trainer.collect_error", error=str(e))
        return TrainingResult(
            status="error",
            message=f"Erro ao coletar dados: {e}",
            metrics={},
            n_samples=0,
        )

    if len(records) < _MIN_SAMPLES:
        return TrainingResult(
            status="insufficient_data",
            message=f"Dados insuficientes: {len(records)} leads fechados (mínimo: {_MIN_SAMPLES}).",
            metrics={"n_samples": len(records)},
            n_samples=len(records),
        )

    # 2. Prepara dados
    features_list = [r.features for r in records]
    labels = [r.label for r in records]

    # 3. Treina novo modelo
    model = GradientBoostModel()
    try:
        metrics = model.fit(features_list, labels)
    except Exception as e:
        log.error("trainer.fit_error", error=str(e))
        return TrainingResult(
            status="error",
            message=f"Erro no treinamento: {e}",
            metrics={},
            n_samples=len(records),
        )

    new_auc = metrics.get("auc_roc", 0.0)

    # 4. Verifica qualidade mínima
    if new_auc < _MIN_AUC_TO_SAVE:
        return TrainingResult(
            status="no_improvement",
            message=f"AUC muito baixa ({new_auc:.3f} < {_MIN_AUC_TO_SAVE}). Modelo não salvo.",
            metrics=metrics,
            n_samples=len(records),
        )

    # 5. Compara com modelo atual
    if not force:
        current_meta = store.get_metadata()
        current_auc = current_meta.get("auc_roc", 0.0)
        if new_auc < current_auc + _IMPROVEMENT_DELTA:
            log.info("trainer.no_improvement", new_auc=new_auc, current_auc=current_auc)
            return TrainingResult(
                status="no_improvement",
                message=(
                    f"Novo modelo (AUC={new_auc:.3f}) não melhora o atual "
                    f"(AUC={current_auc:.3f}) por ≥{_IMPROVEMENT_DELTA}. "
                    "Use force=True para forçar substituição."
                ),
                metrics=metrics,
                n_samples=len(records),
            )

    # 6. Salva modelo
    store.save(
        model,
        metadata={
            **metrics,
            "trained_at": datetime.now(tz=timezone.utc).isoformat(),
            "model_name": model.name,
            "feature_importances": model.feature_importances,
        },
    )

    log.info("trainer.success", **metrics)
    return TrainingResult(
        status="success",
        message=f"Modelo treinado com sucesso. AUC={new_auc:.3f}",
        metrics=metrics,
        n_samples=len(records),
    )
