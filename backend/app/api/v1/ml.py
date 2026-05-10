"""Endpoints do módulo ML — treinamento, status, feature importance e forecast."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.auth import CurrentUserDep, get_current_user
from app.deps.db import get_session
from app.services.ml_service import MLService

router = APIRouter(
    prefix="/ml",
    tags=["ml"],
    dependencies=[Depends(get_current_user)],
)


class TrainResponse(BaseModel):
    status: str
    message: str
    metrics: dict
    n_samples: int


class ForecastResponse(BaseModel):
    total_esperado_30d: float
    total_esperado_90d: float
    total_esperado_12m: float
    total_pipeline: float
    n_leads_considerados: int
    confianca: str
    breakdown_por_probabilidade: list[dict]
    breakdown_por_periodo: dict


@router.post("/train", response_model=TrainResponse)
async def train_model(
    user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
    force: bool = False,
) -> TrainResponse:
    """Treina/retreina o modelo ML com dados históricos.

    Requer perfil: master.
    O model só é substituído se AUC melhorar ≥ 0.01 (use force=True para forçar).
    """
    if user.role != "master":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas ADM Master pode retreinar o modelo.",
        )
    svc = MLService(session)
    result = await svc.train_model(force=force)
    return TrainResponse(
        status=result.status,
        message=result.message,
        metrics=result.metrics,
        n_samples=result.n_samples,
    )


@router.get("/status")
async def model_status(
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict:
    """Retorna status atual do modelo: disponibilidade, métricas, n amostras."""
    svc = MLService(session)
    return svc.get_status()


@router.get("/feature-importance")
async def feature_importance(
    user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict:
    """Retorna importância de cada atributo no modelo ML.

    Útil para entender quais sinais mais influenciam as predições.
    """
    if user.role not in ("master", "adm_geral"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito.")
    svc = MLService(session)
    st = svc.get_status()
    meta = st.get("ml_metadata", {})
    importances = meta.get("feature_importances", {})
    if not importances:
        return {"message": "Modelo ainda não treinado ou feature importances não disponíveis."}
    # Ordena por importância decrescente
    sorted_imp = sorted(importances.items(), key=lambda x: x[1], reverse=True)
    return {
        "feature_importances": [{"feature": k, "importance": v} for k, v in sorted_imp],
        "n_training_samples": meta.get("n_samples", 0),
        "model_auc": meta.get("auc_roc"),
    }


@router.get("/forecast", response_model=ForecastResponse)
async def revenue_forecast(
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ForecastResponse:
    """Previsão de receita esperada para 30d, 90d e 12 meses.

    Calcula E[receita] = Σ P(fechar_i) × valor_i para todos os leads ativos.
    """
    svc = MLService(session)
    result = await svc.forecast_revenue()
    return ForecastResponse(
        total_esperado_30d=result.total_esperado_30d,
        total_esperado_90d=result.total_esperado_90d,
        total_esperado_12m=result.total_esperado_12m,
        total_pipeline=result.total_pipeline,
        n_leads_considerados=result.n_leads_considerados,
        confianca=result.confianca,
        breakdown_por_probabilidade=[
            {
                "range": b.range_label,
                "qtd_leads": b.qtd_leads,
                "valor_esperado": b.valor_esperado,
                "valor_pipeline": b.valor_pipeline,
            }
            for b in result.breakdown_por_probabilidade
        ],
        breakdown_por_periodo=result.breakdown_por_periodo,
    )
