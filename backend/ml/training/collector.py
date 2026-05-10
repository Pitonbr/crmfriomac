"""Coleta dados de treinamento do banco de dados.

Busca leads com outcome definitivo (GANHO ou PERDIDO), extrai suas
features e labels para uso no pipeline de treinamento.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead, LeadStatus
from app.models.observacao import Observacao
from app.models.stage import Stage
from ml.features.extractor import LeadFeatures, extract

log = logging.getLogger(__name__)


@dataclass
class TrainingRecord:
    features: LeadFeatures
    label: int  # 1=GANHO, 0=PERDIDO


async def collect_training_data(
    session: AsyncSession,
    max_obs_per_lead: int = 10,
) -> list[TrainingRecord]:
    """Coleta todos os leads fechados com seus features e labels.

    Args:
        session: sessão do banco de dados (com tenant_id configurado via RLS)
        max_obs_per_lead: número máximo de observações por lead a analisar

    Returns:
        Lista de TrainingRecord (features + label) para treinamento
    """
    # Busca leads fechados com stage
    stmt = (
        select(Lead, Stage)
        .join(Stage, Stage.id == Lead.stage_id)
        .where(
            and_(
                Lead.status.in_([LeadStatus.GANHO.value, LeadStatus.PERDIDO.value]),
                Lead.excluido_em.is_(None),
            )
        )
        .order_by(Lead.ganho_em.desc().nullslast(), Lead.perdido_em.desc().nullslast())
    )
    rows = (await session.execute(stmt)).all()

    records: list[TrainingRecord] = []
    for lead, stage in rows:
        # Busca observações do lead
        obs_stmt = (
            select(Observacao.texto, Observacao.criado_em)
            .where(Observacao.lead_id == lead.id)
            .order_by(Observacao.criado_em.desc())
            .limit(max_obs_per_lead)
        )
        obs_rows = (await session.execute(obs_stmt)).all()
        obs_texts = [r[0] for r in obs_rows]
        obs_timestamps = [r[1] for r in obs_rows]

        # Determina se é representante (canal_proprio = False)
        canal_representante = False  # sem info de canal no lead v2

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
            canal_representante=canal_representante,
            probabilidade_override=float(lead.probabilidade_override) if lead.probabilidade_override else None,
            obs_texts=obs_texts,
            obs_timestamps=obs_timestamps,
        )
        label = 1 if lead.status == LeadStatus.GANHO.value else 0
        records.append(TrainingRecord(features=features, label=label))

    log.info("collector.result", n_records=len(records), n_ganho=sum(r.label for r in records))
    return records
