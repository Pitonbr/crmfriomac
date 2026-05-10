import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useMemo } from 'react';
import { toast } from 'sonner';

import type { Cliente, Lead, Representante, Stage } from '@/api/schemas';
import { useMoveLeadStage } from '@/hooks/queries/useLeads';

import { KanbanCard } from './KanbanCard';
import { KanbanColumn } from './KanbanColumn';

interface Props {
  stages: Stage[];
  leads: Lead[];
  clientes: Map<string, Cliente>;
  reps: Map<string, Representante>;
}

export function KanbanBoard({ stages, leads, clientes, reps }: Props) {
  const moveStage = useMoveLeadStage();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const { byStage, ganhoLeads, perdidoLeads } = useMemo(() => {
    const byStage = new Map<string, Lead[]>();
    for (const stage of stages) byStage.set(stage.id, []);
    const ganhoLeads: Lead[] = [];
    const perdidoLeads: Lead[] = [];

    for (const lead of leads) {
      if (lead.status === 'ganho') {
        ganhoLeads.push(lead);
      } else if (lead.status === 'perdido') {
        perdidoLeads.push(lead);
      } else {
        const arr = byStage.get(lead.stage_id);
        if (arr) arr.push(lead);
      }
    }
    return { byStage, ganhoLeads, perdidoLeads };
  }, [stages, leads]);

  const validStageIds = useMemo(() => new Set(stages.map((s) => s.id)), [stages]);

  const handleDragEnd = (event: DragEndEvent) => {
    const leadId = String(event.active.id);
    const newStageId = event.over ? String(event.over.id) : null;
    if (!newStageId) return;

    // Ignora drop em colunas que não são stages reais (outcome columns, área vazia)
    if (!validStageIds.has(newStageId)) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage_id === newStageId) return;

    // Só leads em aberto podem ser movidos via drag
    if (lead.status !== 'em_aberto') return;

    moveStage.mutate(
      { leadId, stage_id: newStageId },
      {
        onError: (err) => {
          const msg = err instanceof Error ? err.message : 'Falha ao mover lead';
          toast.error(msg);
        },
      },
    );
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="kb-board" role="list" aria-label="Funil de vendas">
        {stages.map((stage) => {
          const list = byStage.get(stage.id) ?? [];
          const total = list.reduce((s, l) => s + l.valor, 0);
          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              count={list.length}
              totalValor={total}
            >
              {list.map((lead) => (
                <KanbanCard
                  key={lead.id}
                  lead={lead}
                  cliente={clientes.get(lead.cliente_id)}
                  rep={lead.representante_id ? reps.get(lead.representante_id) : undefined}
                />
              ))}
            </KanbanColumn>
          );
        })}

        {/* Ganhos column */}
        {ganhoLeads.length > 0 && (
          <KanbanColumn
            customId="__ganho__"
            customLabel="Concretizados"
            customIcon="🏆"
            customCor="var(--success)"
            customClass="ganho"
            count={ganhoLeads.length}
            totalValor={ganhoLeads.reduce((s, l) => s + l.valor, 0)}
            droppable={false}
          >
            {ganhoLeads.map((lead) => (
              <KanbanCard
                key={lead.id}
                lead={lead}
                cliente={clientes.get(lead.cliente_id)}
                rep={lead.representante_id ? reps.get(lead.representante_id) : undefined}
              />
            ))}
          </KanbanColumn>
        )}

        {/* Perdidos column */}
        {perdidoLeads.length > 0 && (
          <KanbanColumn
            customId="__perdido__"
            customLabel="Perdidos"
            customIcon="❌"
            customCor="var(--danger)"
            customClass="perdido"
            count={perdidoLeads.length}
            totalValor={perdidoLeads.reduce((s, l) => s + l.valor, 0)}
            droppable={false}
          >
            {perdidoLeads.map((lead) => (
              <KanbanCard
                key={lead.id}
                lead={lead}
                cliente={clientes.get(lead.cliente_id)}
                rep={lead.representante_id ? reps.get(lead.representante_id) : undefined}
              />
            ))}
          </KanbanColumn>
        )}
      </div>
    </DndContext>
  );
}
