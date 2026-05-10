import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createEntrega,
  type EntregaCreatePayload,
  type EntregaUpdatePayload,
  listComissoes,
  listEntregas,
  listOrcamentos,
  updateEntrega,
} from '@/api/orcamentos';

export function useOrcamentos() {
  return useQuery({
    queryKey: ['orcamentos'],
    queryFn: listOrcamentos,
    staleTime: 60_000,
  });
}

export function useComissoes() {
  return useQuery({
    queryKey: ['comissoes'],
    queryFn: listComissoes,
    staleTime: 60_000,
  });
}

export const ENTREGAS_KEY = ['entregas'] as const;

export function useEntregas() {
  return useQuery({
    queryKey: ENTREGAS_KEY,
    queryFn: listEntregas,
    staleTime: 60_000,
  });
}

export function useCreateEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: EntregaCreatePayload) => createEntrega(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ENTREGAS_KEY }),
  });
}

export function useUpdateEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EntregaUpdatePayload }) =>
      updateEntrega(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ENTREGAS_KEY }),
  });
}
