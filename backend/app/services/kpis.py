"""KpiService — agrega métricas para o Dashboard via queries SQL."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead, LeadStatus
from app.models.representante import Representante
from app.models.stage import Stage
from app.schemas.kpi import DashboardKPIs, FunilStage, MesAgg, TopRep


META_ANUAL_DEFAULT = Decimal("12000000")  # mesmo valor do legado


class KpiService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def dashboard(self) -> DashboardKPIs:
        # ── Totais por status ───────────────────────────────────────
        stmt = select(
            Lead.status,
            func.count(Lead.id),
            func.coalesce(func.sum(Lead.valor), 0),
        ).where(Lead.excluido_em.is_(None)).group_by(Lead.status)
        rows = (await self.session.execute(stmt)).all()
        by_status: dict[str, tuple[int, Decimal]] = {
            r[0]: (int(r[1]), Decimal(r[2])) for r in rows
        }

        qtd_abertos, valor_abertos = by_status.get(LeadStatus.EM_ABERTO.value, (0, Decimal(0)))
        qtd_ganhos, valor_ganhos = by_status.get(LeadStatus.GANHO.value, (0, Decimal(0)))
        qtd_perdidos, _ = by_status.get(LeadStatus.PERDIDO.value, (0, Decimal(0)))

        total_orcado = sum((v for _, v in by_status.values()), Decimal(0))
        total_fechado = valor_ganhos
        total_decisao = qtd_ganhos + qtd_perdidos
        taxa_conversao = float(qtd_ganhos) / total_decisao * 100 if total_decisao else 0.0
        ticket_medio = (
            (total_fechado / qtd_ganhos) if qtd_ganhos else Decimal(0)
        )

        # ── Pipeline ponderado (valor * stage.prob_pct / 100) ───────
        stmt = (
            select(func.coalesce(func.sum(Lead.valor * Stage.prob_pct / 100), 0))
            .select_from(Lead)
            .join(Stage, Stage.id == Lead.stage_id)
            .where(Lead.excluido_em.is_(None), Lead.status == LeadStatus.EM_ABERTO.value)
        )
        valor_pipeline_ponderado = Decimal((await self.session.execute(stmt)).scalar() or 0)

        # ── Funil (qtd e valor por stage) ───────────────────────────
        stmt = (
            select(
                Stage.id,
                Stage.label,
                Stage.cor,
                Stage.ordem,
                func.count(Lead.id),
                func.coalesce(func.sum(Lead.valor), 0),
            )
            .select_from(Stage)
            .outerjoin(
                Lead,
                (Lead.stage_id == Stage.id)
                & Lead.excluido_em.is_(None)
                & (Lead.status == LeadStatus.EM_ABERTO.value),
            )
            .group_by(Stage.id, Stage.label, Stage.cor, Stage.ordem)
            .order_by(Stage.ordem)
        )
        funil_rows = (await self.session.execute(stmt)).all()
        funil = [
            FunilStage(
                stage_id=str(r[0]),
                label=r[1],
                cor=r[2],
                ordem=int(r[3]),
                qtd_leads=int(r[4]),
                valor_total=Decimal(r[5]),
            )
            for r in funil_rows
        ]

        # ── Top reps por valor de pipeline ──────────────────────────
        stmt = (
            select(
                Representante.id,
                Representante.nome,
                func.count(Lead.id),
                func.coalesce(func.sum(Lead.valor), 0),
            )
            .select_from(Representante)
            .outerjoin(
                Lead,
                (Lead.representante_id == Representante.id)
                & Lead.excluido_em.is_(None),
            )
            .group_by(Representante.id, Representante.nome)
            .order_by(func.coalesce(func.sum(Lead.valor), 0).desc())
            .limit(10)
        )
        rep_rows = (await self.session.execute(stmt)).all()
        top_reps = [
            TopRep(
                representante_id=str(r[0]),
                nome=r[1],
                qtd_leads=int(r[2]),
                valor_total=Decimal(r[3]),
            )
            for r in rep_rows
        ]

        # ── Agregação mensal (orçados / fechados por YYYY-MM) ───────
        mes_expr = func.to_char(Lead.data_abertura, "YYYY-MM")
        stmt = (
            select(
                mes_expr.label("mes"),
                func.count(Lead.id),
                func.coalesce(func.sum(Lead.valor), 0),
                func.count(case((Lead.status == LeadStatus.GANHO.value, 1))),
                func.coalesce(
                    func.sum(case((Lead.status == LeadStatus.GANHO.value, Lead.valor), else_=0)),
                    0,
                ),
            )
            .where(Lead.excluido_em.is_(None))
            .group_by("mes")
            .order_by("mes")
        )
        mensal_rows = (await self.session.execute(stmt)).all()
        mensal = [
            MesAgg(
                mes=str(r[0]),
                qtd_orc=int(r[1]),
                valor_orc=Decimal(r[2]),
                qtd_fech=int(r[3]),
                valor_fech=Decimal(r[4]),
            )
            for r in mensal_rows
        ]

        return DashboardKPIs(
            meta_anual=META_ANUAL_DEFAULT,
            total_orcado=total_orcado,
            total_fechado=total_fechado,
            qtd_leads_abertos=qtd_abertos,
            qtd_leads_ganhos=qtd_ganhos,
            qtd_leads_perdidos=qtd_perdidos,
            taxa_conversao=round(taxa_conversao, 2),
            ticket_medio=ticket_medio,
            valor_pipeline_ponderado=valor_pipeline_ponderado,
            funil=funil,
            top_reps=top_reps,
            mensal=mensal,
        )
