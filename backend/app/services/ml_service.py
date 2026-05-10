"""MLService — integra o módulo ML com o backend FastAPI.

Responsável por:
1. Executar predições de probabilidade de fechamento usando o ensemble
2. Calcular previsão de receita futura
3. Trigger de retreinamento automático quando há novos dados
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cliente import Cliente
from app.models.lead import Lead, LeadStatus
from app.models.observacao import Observacao
from app.models.stage import Stage
from app.schemas.kpi import LeadProbabilidade
from ml.features.extractor import extract
from ml.forecasting.revenue_forecaster import LeadForecastInput, RevenueForecast, forecast
from ml.prediction.predictor import EnsemblePrediction, get_predictor
from ml.store.model_store import ModelStore
from ml.training.trainer import TrainingResult, train

log = logging.getLogger(__name__)

_MIN_PROB_DISPLAY = 60.0
_MAX_PROB_DISPLAY = 95.0
_STAGE_PROB_THRESHOLD = 55
_MAX_LEADS_TO_SCORE = 100
_MAX_OBS_PER_LEAD = 10


class MLService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self._predictor = get_predictor()

    # ── Probabilidade de Fechamento ──────────────────────────────
    async def probabilidade_fechamento(self) -> list[LeadProbabilidade]:
        """Calcula probabilidade para leads em stages avançados (≥55%).

        Retorna leads com probabilidade entre 60-95%, ordenados do maior.
        """
        stmt = (
            select(Lead, Cliente, Stage)
            .join(Cliente, Cliente.id == Lead.cliente_id)
            .join(Stage, Stage.id == Lead.stage_id)
            .where(
                and_(
                    Lead.excluido_em.is_(None),
                    Lead.status == LeadStatus.EM_ABERTO.value,
                    Stage.prob_pct >= _STAGE_PROB_THRESHOLD,
                )
            )
            .order_by(Lead.data_ultima_movimentacao.desc())
            .limit(_MAX_LEADS_TO_SCORE)
        )
        rows = (await self.session.execute(stmt)).all()

        results: list[tuple[float, LeadProbabilidade]] = []
        for lead, cliente, stage in rows:
            obs_texts, obs_timestamps = await self._get_obs(lead.id)

            features = extract(
                stage_prob_pct=stage.prob_pct,
                stage_ordem=stage.ordem,
                valor=float(lead.valor),
                data_abertura=lead.data_abertura,
                data_ultima_movimentacao=lead.data_ultima_movimentacao,
                prioridade=lead.prioridade.value if hasattr(lead.prioridade, 'value') else str(lead.prioridade),
                projeto_2d_enviado=bool(lead.projeto_2d_enviado),
                projeto_3d_enviado=bool(lead.projeto_3d_enviado),
                data_ultimo_contato=lead.data_ultimo_contato,
                valor_entrada=float(lead.valor_entrada) if lead.valor_entrada else None,
                forma_pagamento=lead.forma_pagamento,
                canal_representante=False,
                probabilidade_override=float(lead.probabilidade_override) if lead.probabilidade_override else None,
                obs_texts=obs_texts,
                obs_timestamps=obs_timestamps,
            )

            pred: EnsemblePrediction = self._predictor.predict(features)
            prob = pred.probability

            if not (_MIN_PROB_DISPLAY <= prob <= _MAX_PROB_DISPLAY):
                continue

            results.append((prob, LeadProbabilidade(
                id=str(lead.id),
                codigo=lead.codigo,
                nome_fantasia=cliente.nome_fantasia or lead.codigo,
                valor=Decimal(lead.valor),
                stage_label=stage.label,
                stage_cor=stage.cor,
                probabilidade_calculada=prob,
                probabilidade_base=float(stage.prob_pct),
                boost_keywords=features.kw_score_total,
                boost_projeto=float(features.ambos_projetos * 12 or features.projeto_3d_enviado * 8 or features.projeto_2d_enviado * 5),
                penalidade_tempo=0.0,
                ajuste_manual=features.probabilidade_manual,
                keywords_encontradas=self._extract_found_keywords(obs_texts),
            )))

        results.sort(key=lambda x: x[0], reverse=True)
        return [r for _, r in results[:15]]

    # ── Previsão de Receita ──────────────────────────────────────
    async def forecast_revenue(self) -> RevenueForecast:
        """Calcula previsão de receita para os próximos 30d, 90d e 12m."""
        # Busca todos os leads ativos com stage
        stmt = (
            select(Lead, Stage)
            .join(Stage, Stage.id == Lead.stage_id)
            .where(
                and_(
                    Lead.excluido_em.is_(None),
                    Lead.status == LeadStatus.EM_ABERTO.value,
                )
            )
        )
        rows = (await self.session.execute(stmt)).all()

        inputs: list[LeadForecastInput] = []
        for lead, stage in rows:
            obs_texts, obs_timestamps = await self._get_obs(lead.id)
            features = extract(
                stage_prob_pct=stage.prob_pct,
                stage_ordem=stage.ordem,
                valor=float(lead.valor),
                data_abertura=lead.data_abertura,
                data_ultima_movimentacao=lead.data_ultima_movimentacao,
                prioridade=lead.prioridade.value if hasattr(lead.prioridade, 'value') else str(lead.prioridade),
                projeto_2d_enviado=bool(lead.projeto_2d_enviado),
                projeto_3d_enviado=bool(lead.projeto_3d_enviado),
                data_ultimo_contato=lead.data_ultimo_contato,
                valor_entrada=float(lead.valor_entrada) if lead.valor_entrada else None,
                forma_pagamento=lead.forma_pagamento,
                canal_representante=False,
                probabilidade_override=float(lead.probabilidade_override) if lead.probabilidade_override else None,
                obs_texts=obs_texts,
                obs_timestamps=obs_timestamps,
            )
            pred = self._predictor.predict(features)
            now = datetime.now(tz=timezone.utc)
            ref = lead.data_ultima_movimentacao.replace(tzinfo=timezone.utc) if lead.data_ultima_movimentacao.tzinfo is None else lead.data_ultima_movimentacao
            days_in_stage = max(0, (now - ref).days)
            inputs.append(LeadForecastInput(
                lead_id=str(lead.id),
                valor=lead.valor,
                probabilidade=pred.probability,
                stage_slug=stage.slug,
                days_in_stage=days_in_stage,
            ))

        return forecast(inputs)

    # ── Treinamento ──────────────────────────────────────────────
    async def train_model(self, force: bool = False) -> TrainingResult:
        """Retreina o modelo ML com dados históricos atuais."""
        store = ModelStore()
        result = await train(self.session, store=store, force=force)
        if result.status == "success":
            self._predictor.reload()
        return result

    # ── Status ───────────────────────────────────────────────────
    def get_status(self) -> dict:
        return self._predictor.status

    # ── Helpers ──────────────────────────────────────────────────
    async def _get_obs(self, lead_id: object) -> tuple[list[str], list[datetime]]:
        obs_stmt = (
            select(Observacao.texto, Observacao.criado_em)
            .where(Observacao.lead_id == lead_id)
            .order_by(Observacao.criado_em.desc())
            .limit(_MAX_OBS_PER_LEAD)
        )
        rows = (await self.session.execute(obs_stmt)).all()
        return [r[0] for r in rows], [r[1] for r in rows]

    @staticmethod
    def _extract_found_keywords(obs_texts: list[str]) -> list[str]:
        """Extrai palavras-chave positivas encontradas nas observações."""
        from app.services.probabilidade import KEYWORDS_BOOST
        all_text = " ".join(obs_texts).lower()
        return [kw for kw in KEYWORDS_BOOST if kw in all_text][:5]
