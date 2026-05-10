/**
 * Hook que conecta eventos WebSocket de leads ao cache do React Query.
 *
 * Estratégia:
 * - lead.created/deleted → invalida ['leads'] (refetch)
 * - lead.stage_moved → setQueryData direto (atualização suave sem flicker)
 * - lead.concluded → invalida (status mudou)
 *
 * Se o evento foi disparado pelo próprio usuário (actorId === currentUser.id),
 * ignora — a mutação otimista já aplicou.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { Lead } from '@/api/schemas';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { useAuthStore } from '@/store/authStore';

import { LEADS_KEY } from './queries/useLeads';

export function useLeadsRealtime(): void {
  const qc = useQueryClient();
  const ws = useWebSocket();
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    return ws.subscribe((evt) => {
      // Ignora eventos próprios (já aplicados otimisticamente)
      if (userId && evt.actorId === userId) return;

      if (evt.type === 'lead.created' || evt.type === 'lead.deleted') {
        qc.invalidateQueries({ queryKey: LEADS_KEY });
        return;
      }

      if (evt.type === 'lead.stage_moved') {
        const leadId = evt.payload.lead_id as string | undefined;
        const toStageId = evt.payload.to_stage_id as string | undefined;
        if (!leadId || !toStageId) return;

        const queries = qc.getQueriesData({ queryKey: LEADS_KEY });
        queries.forEach(([key, data]) => {
          // Só atualiza listas de leads (arrays com stage_id)
          if (!data || !Array.isArray(data)) return;
          const first = data[0] as Record<string, unknown> | undefined;
          if (first && typeof first.stage_id === 'undefined') return;
          qc.setQueryData<Lead[]>(
            key,
            (data as Lead[]).map((l) => (l.id === leadId ? { ...l, stage_id: toStageId } : l)),
          );
        });
        // Invalida o lead individual e o pipeline de probabilidade
        qc.invalidateQueries({ queryKey: [...LEADS_KEY, leadId] });
        return;
      }

      if (evt.type === 'lead.concluded') {
        qc.invalidateQueries({ queryKey: LEADS_KEY });
      }
    });
  }, [qc, ws, userId]);
}
