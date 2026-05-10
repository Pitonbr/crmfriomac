"""Endpoint de KPIs do Dashboard."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.auth import CurrentUserDep, get_current_user
from app.deps.db import get_session
from app.schemas.kpi import DashboardKPIs, LeadProbabilidade
from app.services.kpis import KpiService
from app.services.ml_service import MLService

router = APIRouter(prefix="/kpis", tags=["kpis"], dependencies=[Depends(get_current_user)])


@router.get("/dashboard", response_model=DashboardKPIs)
async def dashboard(
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DashboardKPIs:
    service = KpiService(session)
    return await service.dashboard()


@router.get("/probabilidade-fechamento", response_model=list[LeadProbabilidade])
async def probabilidade_fechamento(
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[LeadProbabilidade]:
    """Retorna leads com probabilidade de fechamento entre 60% e 95%.

    Usa o ensemble ML+Regras: modelo GBM calibrado quando há dados suficientes,
    modelo de regras (baseline) caso contrário.
    """
    svc = MLService(session)
    return await svc.probabilidade_fechamento()
