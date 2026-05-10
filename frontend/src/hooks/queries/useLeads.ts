import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addObservacao,
  concluirLead,
  createLead,
  type LeadCreatePayload,
  type LeadFilters,
  type LeadUpdatePayload,
  deleteLead,
  getLead,
  listAnexos,
  listLeads,
  listObservacoes,
  moveLeadStage,
  reativarLead,
  updateLead,
  uploadAnexo,
} from '@/api/leads';
import type { Lead } from '@/api/schemas';

export const LEADS_KEY = ['leads'] as const;

export function useLeads(filters: LeadFilters = {}) {
  return useQuery({
    queryKey: [...LEADS_KEY, filters],
    queryFn: () => listLeads(filters),
    staleTime: 30_000,
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: [...LEADS_KEY, id],
    queryFn: () => getLead(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useObservacoes(leadId: string | undefined) {
  return useQuery({
    queryKey: [...LEADS_KEY, leadId, 'observacoes'],
    queryFn: () => listObservacoes(leadId!),
    enabled: !!leadId,
    staleTime: 30_000,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LeadCreatePayload) => createLead(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEADS_KEY }),
  });
}

/**
 * Mover stage com optimistic update (essencial para Kanban DnD).
 * Atualiza cache local imediatamente; em erro, faz rollback.
 */
export function useMoveLeadStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, stage_id }: { leadId: string; stage_id: string }) =>
      moveLeadStage(leadId, stage_id),

    onMutate: async ({ leadId, stage_id }) => {
      await qc.cancelQueries({ queryKey: LEADS_KEY });
      const snapshots = qc.getQueriesData({ queryKey: LEADS_KEY });

      snapshots.forEach(([key, data]) => {
        // Só atualiza queries que são listas de leads (arrays de objetos com .id e .stage_id)
        if (!data || !Array.isArray(data)) return;
        const firstItem = data[0] as Record<string, unknown> | undefined;
        if (firstItem && typeof firstItem.stage_id === 'undefined') return; // não é Lead[]
        qc.setQueryData<Lead[]>(
          key,
          (data as Lead[]).map((l) => (l.id === leadId ? { ...l, stage_id } : l)),
        );
      });
      return { snapshots };
    },

    onError: (_err, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data));
    },

    onSettled: (_data, _err, vars) => {
      // Refetch lista de leads e lead individual para obter SLA, stage e probabilidade atualizados
      qc.invalidateQueries({ queryKey: LEADS_KEY });
      qc.invalidateQueries({ queryKey: [...LEADS_KEY, vars.leadId] });
    },
  });
}

export function useConcluirLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      leadId,
      resultado,
      motivo_perda,
    }: {
      leadId: string;
      resultado: 'ganho' | 'perdido';
      motivo_perda?: string;
    }) => concluirLead(leadId, resultado, motivo_perda),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEADS_KEY }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => deleteLead(leadId),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEADS_KEY }),
  });
}

export function useAddObservacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, texto }: { leadId: string; texto: string }) =>
      addObservacao(leadId, texto),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: [...LEADS_KEY, vars.leadId, 'observacoes'] }),
  });
}

export function useReativarLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => reativarLead(leadId),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEADS_KEY }),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, payload }: { leadId: string; payload: LeadUpdatePayload }) =>
      updateLead(leadId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: LEADS_KEY }),
  });
}

export function useAnexos(leadId: string | undefined) {
  return useQuery({
    queryKey: [...LEADS_KEY, leadId, 'anexos'],
    queryFn: () => listAnexos(leadId!),
    enabled: !!leadId,
    staleTime: 30_000,
  });
}

export function useUploadAnexo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, file }: { leadId: string; file: File }) =>
      uploadAnexo(leadId, file),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: [...LEADS_KEY, vars.leadId, 'anexos'] }),
  });
}

