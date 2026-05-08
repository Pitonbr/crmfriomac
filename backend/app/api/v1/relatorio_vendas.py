"""Endpoint de Relatório de Vendas — espelha a planilha 'Relatorio vendas 2026.xlsx'."""

from datetime import date
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import and_, extract, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.auth import CurrentUserDep, get_current_user
from app.deps.db import get_session
from app.models.cliente import Cliente
from app.models.lead import Lead, LeadStatus
from app.models.representante import Representante

router = APIRouter(
    prefix="/relatorio-vendas",
    tags=["relatorio-vendas"],
    dependencies=[Depends(get_current_user)],
)


class ItemRelatorioVendas(BaseModel):
    model_config = ConfigDict(from_attributes=False)

    lead_id: UUID
    codigo: str
    data_fechamento: date | None
    cliente: str
    cidade: str | None
    estado: str | None
    vendedor: str
    valor_total: Decimal
    valor_entrada: Decimal | None
    percentual_entrada: Decimal | None
    forma_pagamento: str | None


class RelatorioVendasOut(BaseModel):
    items: list[ItemRelatorioVendas]
    total_valor: Decimal
    total_entrada: Decimal
    qtd_vendas: int


@router.get("", response_model=RelatorioVendasOut)
async def relatorio_vendas(
    user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
    ano: int | None = Query(default=None, description="Filtro por ano (ex: 2026)"),
    mes: int | None = Query(default=None, ge=1, le=12, description="Filtro por mês (1-12)"),
    representante_id: UUID | None = Query(default=None),
) -> RelatorioVendasOut:
    tenant_id = user.tenant_id

    stmt = (
        select(Lead, Cliente, Representante)
        .join(Cliente, Lead.cliente_id == Cliente.id)
        .outerjoin(Representante, Lead.representante_id == Representante.id)
        .where(
            and_(
                Lead.tenant_id == tenant_id,
                Lead.status == LeadStatus.GANHO,
                Lead.excluido_em.is_(None),
            )
        )
        .order_by(Lead.ganho_em.desc())
    )

    if ano:
        stmt = stmt.where(extract("year", Lead.ganho_em) == ano)
    if mes:
        stmt = stmt.where(extract("month", Lead.ganho_em) == mes)
    if representante_id:
        stmt = stmt.where(Lead.representante_id == representante_id)

    rows = (await session.execute(stmt)).all()

    items: list[ItemRelatorioVendas] = []
    total_valor = Decimal("0")
    total_entrada = Decimal("0")

    for lead, cliente, rep in rows:
        entrada = lead.valor_entrada or Decimal("0")
        items.append(
            ItemRelatorioVendas(
                lead_id=lead.id,
                codigo=lead.codigo,
                data_fechamento=lead.ganho_em.date() if lead.ganho_em else None,
                cliente=cliente.nome_fantasia or cliente.razao_social or "—",
                cidade=cliente.cidade,
                estado=cliente.estado,
                vendedor=rep.nome if rep else "—",
                valor_total=lead.valor,
                valor_entrada=lead.valor_entrada,
                percentual_entrada=lead.percentual_entrada,
                forma_pagamento=lead.forma_pagamento,
            )
        )
        total_valor += lead.valor
        total_entrada += entrada

    return RelatorioVendasOut(
        items=items,
        total_valor=total_valor,
        total_entrada=total_entrada,
        qtd_vendas=len(items),
    )
