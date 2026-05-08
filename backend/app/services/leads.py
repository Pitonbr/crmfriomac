"""LeadService — regras de negócio (criar, mover stage, concluir).

Dispara eventos WebSocket via `ws_manager` em todas as mutações para
que clients abertos no Kanban atualizem em tempo real.

Em GANHO, cria automaticamente:
- Entrega (status=planejada, prazo +30 dias por padrão)
- Comissão (se tiver representante; usa rep.comissao_pct sobre lead.valor)
"""

from datetime import date, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import utcnow
from app.models.comissao import Comissao
from app.models.entrega import Entrega
from app.models.lead import Lead, LeadStatus
from app.models.observacao import Observacao, ObservacaoTipo
from app.repositories.leads import LeadRepository
from app.repositories.observacoes import ObservacaoRepository
from app.repositories.representantes import RepresentanteRepository
from app.repositories.stages import StageRepository
from app.schemas.lead import LeadCreate
from app.ws.events import WsEvent
from app.ws.manager import ws_manager


class LeadServiceError(Exception):
    pass


class LeadNotFound(LeadServiceError):
    pass


class StageNotFound(LeadServiceError):
    pass


class InvalidTransition(LeadServiceError):
    pass


class LeadService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.leads = LeadRepository(session)
        self.stages = StageRepository(session)
        self.obs = ObservacaoRepository(session)

    async def create(
        self,
        *,
        tenant_id: UUID,
        criado_por: UUID,
        autor_nome: str,
        payload: LeadCreate,
    ) -> Lead:
        stage = await self.stages.get_by_id(payload.stage_id)
        if stage is None:
            raise StageNotFound("stage não encontrado")

        now = utcnow()
        sla = payload.sla_deadline or (
            now + timedelta(hours=stage.sla_horas) if stage.sla_horas > 0 else None
        )

        codigo = await self.leads.next_codigo()
        lead = Lead(
            id=uuid4(),
            tenant_id=tenant_id,
            codigo=codigo,
            cliente_id=payload.cliente_id,
            representante_id=payload.representante_id,
            stage_id=payload.stage_id,
            criado_por=criado_por,
            projeto=payload.projeto,
            valor=payload.valor,
            prioridade=payload.prioridade,
            status=LeadStatus.EM_ABERTO,
            data_abertura=now,
            data_ultima_movimentacao=now,
            sla_deadline=sla,
            tags=payload.tags,
            metadados={},
        )
        await self.leads.add(lead)
        await self.obs.add(
            Observacao(
                id=uuid4(),
                tenant_id=tenant_id,
                lead_id=lead.id,
                autor_id=criado_por,
                autor_nome=autor_nome,
                texto=f"Lead criado em estágio '{stage.label}'.",
                tipo=ObservacaoTipo.SISTEMA,
            )
        )

        await ws_manager.broadcast_tenant(
            WsEvent(
                type="lead.created",
                tenant_id=tenant_id,
                actor_id=criado_por,
                actor_nome=autor_nome,
                payload={"lead_id": str(lead.id), "stage_id": str(stage.id)},
            )
        )
        return lead

    async def move_stage(
        self,
        *,
        tenant_id: UUID,
        lead_id: UUID,
        new_stage_id: UUID,
        autor_id: UUID,
        autor_nome: str,
    ) -> Lead:
        lead = await self.leads.get_by_id(lead_id)
        if lead is None:
            raise LeadNotFound("lead não encontrado")
        if lead.status != LeadStatus.EM_ABERTO:
            raise InvalidTransition(
                f"lead em status '{lead.status.value}' não pode mudar de estágio"
            )

        new_stage = await self.stages.get_by_id(new_stage_id)
        if new_stage is None:
            raise StageNotFound("stage destino não encontrado")

        old_stage = await self.stages.get_by_id(lead.stage_id)
        old_label = old_stage.label if old_stage else "?"
        old_stage_id = lead.stage_id

        now = utcnow()
        lead.stage_id = new_stage_id
        lead.data_ultima_movimentacao = now
        lead.sla_deadline = (
            now + timedelta(hours=new_stage.sla_horas) if new_stage.sla_horas > 0 else None
        )

        await self.obs.add(
            Observacao(
                id=uuid4(),
                tenant_id=tenant_id,
                lead_id=lead.id,
                autor_id=autor_id,
                autor_nome=autor_nome,
                texto=f"Movido de '{old_label}' para '{new_stage.label}'.",
                tipo=ObservacaoTipo.SISTEMA,
            )
        )
        await self.session.flush()

        await ws_manager.broadcast_tenant(
            WsEvent(
                type="lead.stage_moved",
                tenant_id=tenant_id,
                actor_id=autor_id,
                actor_nome=autor_nome,
                payload={
                    "lead_id": str(lead.id),
                    "from_stage_id": str(old_stage_id),
                    "to_stage_id": str(new_stage_id),
                },
            )
        )
        return lead

    async def concluir(
        self,
        *,
        tenant_id: UUID,
        lead_id: UUID,
        resultado: LeadStatus,
        motivo_perda: str | None,
        autor_id: UUID,
        autor_nome: str,
    ) -> Lead:
        if resultado not in (LeadStatus.GANHO, LeadStatus.PERDIDO):
            raise InvalidTransition("resultado deve ser 'ganho' ou 'perdido'")

        lead = await self.leads.get_by_id(lead_id)
        if lead is None:
            raise LeadNotFound("lead não encontrado")

        now = utcnow()
        lead.status = resultado
        lead.data_ultima_movimentacao = now
        if resultado == LeadStatus.GANHO:
            lead.ganho_em = now
            lead.motivo_perda = None
            obs_text = "Venda concluída (GANHO)."
        else:
            lead.perdido_em = now
            lead.motivo_perda = motivo_perda
            obs_text = f"Lead PERDIDO. Motivo: {motivo_perda or '—'}"

        await self.obs.add(
            Observacao(
                id=uuid4(),
                tenant_id=tenant_id,
                lead_id=lead.id,
                autor_id=autor_id,
                autor_nome=autor_nome,
                texto=obs_text,
                tipo=ObservacaoTipo.SISTEMA,
            )
        )

        # Em GANHO: criar entrega planejada + comissões (regra 6% = Caio 2% + vendedor 4%)
        if resultado == LeadStatus.GANHO:
            entrega = Entrega(
                id=uuid4(),
                tenant_id=tenant_id,
                lead_id=lead.id,
                prazo_estimado=date.today() + timedelta(days=30),
                status="planejada",
            )
            self.session.add(entrega)

            rep_repo = RepresentanteRepository(self.session)

            if lead.representante_id:
                rep = await rep_repo.get_by_id(lead.representante_id)
                if rep is not None:
                    # Comissão do vendedor/rep: sempre 4% sobre o valor
                    valor_com_vend = (Decimal(lead.valor) * Decimal("4") / Decimal("100")).quantize(Decimal("0.01"))
                    self.session.add(Comissao(
                        id=uuid4(), tenant_id=tenant_id,
                        representante_id=rep.id, lead_id=lead.id,
                        valor_base=lead.valor, percentual=Decimal("4"),
                        valor_comissao=valor_com_vend, status="pendente",
                    ))

            # Comissão fixa do Caio: sempre 2% sobre TODAS as vendas
            caio = await rep_repo.get_by_nome_parcial("Caio Victor", tenant_id)
            if caio and caio.id != lead.representante_id:
                valor_com_caio = (Decimal(lead.valor) * Decimal("2") / Decimal("100")).quantize(Decimal("0.01"))
                self.session.add(Comissao(
                    id=uuid4(), tenant_id=tenant_id,
                    representante_id=caio.id, lead_id=lead.id,
                    valor_base=lead.valor, percentual=Decimal("2"),
                    valor_comissao=valor_com_caio, status="pendente",
                ))

        await self.session.flush()

        await ws_manager.broadcast_tenant(
            WsEvent(
                type="lead.concluded",
                tenant_id=tenant_id,
                actor_id=autor_id,
                actor_nome=autor_nome,
                payload={"lead_id": str(lead.id), "resultado": str(resultado)},
            )
        )
        return lead
