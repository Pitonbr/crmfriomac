"""API v1 — agrega todos os routers."""

from fastapi import APIRouter

from app.api.v1 import (
    anexos,
    auth,
    clientes,
    comissoes,
    entregas,
    kpis,
    leads,
    orcamentos,
    representantes,
    stages,
)

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(stages.router)
router.include_router(clientes.router)
router.include_router(representantes.router)
router.include_router(leads.router)
router.include_router(orcamentos.router)
router.include_router(comissoes.router)
router.include_router(entregas.router)
router.include_router(anexos.router)
router.include_router(kpis.router)
