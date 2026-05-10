"""KpiService — agrega métricas para o Dashboard via queries SQL."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cliente import Cliente
from app.models.lead import Lead, LeadPrioridade, LeadStatus
from app.models.representante import Representante
from app.models.stage import Stage
from app.schemas.kpi import (
    DashboardKPIs,
    FunilStage,
    LeadRecente,
    MesAgg,
    TopLead,
    TopRep,
)


META_ANUAL_DEFAULT = Decimal("12000000")  # mesmo valor do legado


class KpiService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def dashboard(self) -> DashboardKPIs:
        now = datetime.now(tz=timezone.utc)
        cutoff_90 = now - timedelta(days=90)

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
        qtd_ganhos,  valor_ganhos  = by_status.get(LeadStatus.GANHO.value,    (0, Decimal(0)))
        qtd_perdidos, valor_perdidos = by_status.get(LeadStatus.PERDIDO.value, (0, Decimal(0)))

        total_orcado   = valor_abertos
        total_fechado  = valor_ganhos
        total_perdido  = valor_perdidos
        total_decisao  = qtd_ganhos + qtd_perdidos
        taxa_conversao = float(qtd_ganhos) / total_decisao * 100 if total_decisao else 0.0
        ticket_medio   = (total_fechado / qtd_ganhos) if qtd_ganhos else Decimal(0)

        # ── Alta prioridade em aberto ───────────────────────────────
        stmt_alta = select(func.count(Lead.id)).where(
            Lead.excluido_em.is_(None),
            Lead.status == LeadStatus.EM_ABERTO.value,
            Lead.prioridade == LeadPrioridade.ALTA.value,
        )
        leads_alta_prioridade = int((await self.session.execute(stmt_alta)).scalar() or 0)

        # ── Leads >90 dias sem movimentação ─────────────────────────
        stmt_90 = select(func.count(Lead.id)).where(
            Lead.excluido_em.is_(None),
            Lead.status == LeadStatus.EM_ABERTO.value,
            Lead.data_ultima_movimentacao <= cutoff_90,
        )
        leads_mais_90_dias = int((await self.session.execute(stmt_90)).scalar() or 0)

        # ── Vendedores ativos (representantes) ──────────────────────
        stmt_vend = select(func.count(Representante.id)).where(Representante.ativo.is_(True))
        vendedores_ativos = int((await self.session.execute(stmt_vend)).scalar() or 0)

        # ── Pipeline ponderado (valor * stage.prob_pct / 100) ───────
        stmt_pond = (
            select(func.coalesce(func.sum(Lead.valor * Stage.prob_pct / 100), 0))
            .select_from(Lead)
            .join(Stage, Stage.id == Lead.stage_id)
            .where(Lead.excluido_em.is_(None), Lead.status == LeadStatus.EM_ABERTO.value)
        )
        valor_pipeline_ponderado = Decimal(
            (await self.session.execute(stmt_pond)).scalar() or 0
        )

        # ── Funil (qtd e valor por stage, com icone) ────────────────
        stmt_funil = (
            select(
                Stage.id,
                Stage.label,
                Stage.icone,
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
            .group_by(Stage.id, Stage.label, Stage.icone, Stage.cor, Stage.ordem)
            .order_by(Stage.ordem)
        )
        funil_rows = (await self.session.execute(stmt_funil)).all()
        funil = [
            FunilStage(
                stage_id=str(r[0]),
                label=r[1],
                icone=r[2] or "📋",
                cor=r[3],
                ordem=int(r[4]),
                qtd_leads=int(r[5]),
                valor_total=Decimal(r[6]),
            )
            for r in funil_rows
        ]

        # ── Top reps por valor de pipeline ──────────────────────────
        stmt_reps = (
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
        rep_rows = (await self.session.execute(stmt_reps)).all()
        top_reps = [
            TopRep(
                representante_id=str(r[0]),
                nome=r[1],
                qtd_leads=int(r[2]),
                valor_total=Decimal(r[3]),
            )
            for r in rep_rows
        ]

        # ── Top 8 leads em aberto por valor ─────────────────────────
        stmt_top = (
            select(
                Lead.id,
                Lead.codigo,
                Lead.valor,
                Lead.data_abertura,
                Lead.prioridade,
                Cliente.nome_fantasia,
                Stage.label,
                Stage.icone,
                Stage.cor,
            )
            .select_from(Lead)
            .join(Cliente, Cliente.id == Lead.cliente_id)
            .join(Stage, Stage.id == Lead.stage_id)
            .where(Lead.excluido_em.is_(None), Lead.status == LeadStatus.EM_ABERTO.value)
            .order_by(Lead.valor.desc())
            .limit(8)
        )
        top_lead_rows = (await self.session.execute(stmt_top)).all()
        top_leads = [
            TopLead(
                id=str(r[0]),
                codigo=r[1],
                valor=Decimal(r[2]),
                dias_aberto=max(0, (now - r[3].replace(tzinfo=timezone.utc if r[3].tzinfo is None else r[3].tzinfo)).days),
                prioridade=r[4],
                nome_fantasia=r[5] or r[1],
                stage_label=r[6],
                stage_icone=r[7] or "📋",
                stage_cor=r[8],
            )
            for r in top_lead_rows
        ]

        # ── Últimos 6 leads cadastrados ─────────────────────────────
        stmt_rec = (
            select(
                Lead.id,
                Lead.codigo,
                Lead.valor,
                Lead.data_abertura,
                Lead.prioridade,
                Cliente.nome_fantasia,
                Stage.label,
            )
            .select_from(Lead)
            .join(Cliente, Cliente.id == Lead.cliente_id)
            .join(Stage, Stage.id == Lead.stage_id)
            .where(Lead.excluido_em.is_(None))
            .order_by(Lead.data_abertura.desc())
            .limit(6)
        )
        rec_rows = (await self.session.execute(stmt_rec)).all()
        leads_recentes = [
            LeadRecente(
                id=str(r[0]),
                codigo=r[1],
                valor=Decimal(r[2]),
                data_abertura=r[3],
                prioridade=r[4],
                nome_fantasia=r[5] or r[1],
                stage_label=r[6],
            )
            for r in rec_rows
        ]

        # ── Agregação mensal ────────────────────────────────────────
        mes_expr = func.to_char(Lead.data_abertura, "YYYY-MM")
        stmt_mensal = (
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
        mensal_rows = (await self.session.execute(stmt_mensal)).all()
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
            total_perdido=total_perdido,
            qtd_leads_abertos=qtd_abertos,
            qtd_leads_ganhos=qtd_ganhos,
            qtd_leads_perdidos=qtd_perdidos,
            leads_alta_prioridade=leads_alta_prioridade,
            leads_mais_90_dias=leads_mais_90_dias,
            vendedores_ativos=vendedores_ativos,
            taxa_conversao=round(taxa_conversao, 2),
            ticket_medio=ticket_medio,
            valor_pipeline_ponderado=valor_pipeline_ponderado,
            funil=funil,
            top_reps=top_reps,
            mensal=mensal,
            top_leads=top_leads,
            leads_recentes=leads_recentes,
        )
