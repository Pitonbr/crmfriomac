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

import type { Cliente, Lead, Stage } from '@/api/schemas';
import { useMoveLeadStage } from '@/hooks/queries/useLeads';

import { KanbanCard } from './KanbanCard';
import { KanbanColumn } from './KanbanColumn';

interface Props {
  stages: Stage[];
  leads: Lead[];
  clientes: Map<string, Cliente>;
}

export function KanbanBoard({ stages, leads, clientes }: Props) {
  const moveStage = useMoveLeadStage();

  // Sensors com activation distance (evita drag em clique simples)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  // Agrupa leads por stage_id
  const byStage = useMemo(() => {
    const m = new Map<string, Lead[]>();
    for (const stage of stages) m.set(stage.id, []);
    for (const lead of leads) {
      const arr = m.get(lead.stage_id);
      if (arr) arr.push(lead);
    }
    return m;
  }, [stages, leads]);

  const handleDragEnd = (event: DragEndEvent) => {
    const leadId = String(event.active.id);
    const newStageId = event.over ? String(event.over.id) : null;
    if (!newStageId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage_id === newStageId) return;

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
          return (
            <KanbanColumn key={stage.id} stage={stage} count={list.length}>
              {list.map((lead) => (
                <KanbanCard
                  key={lead.id}
                  lead={lead}
                  cliente={clientes.get(lead.cliente_id)}
                />
              ))}
            </KanbanColumn>
          );
        })}
      </div>
    </DndContext>
  );
}
