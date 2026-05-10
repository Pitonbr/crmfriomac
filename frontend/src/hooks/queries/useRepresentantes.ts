import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listRepresentantes,
  listRepresentantesAll,
  createRepresentante,
  updateRepresentante,
  type RepCreatePayload,
  type RepUpdatePayload,
} from '@/api/representantes';

export const REPS_KEY = ['representantes'] as const;

export function useRepresentantes() {
  return useQuery({
    queryKey: REPS_KEY,
    queryFn: listRepresentantes,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRepresentantesAll() {
  return useQuery({
    queryKey: [...REPS_KEY, 'all'],
    queryFn: listRepresentantesAll,
    staleTime: 30_000,
  });
}

export function useCreateRepresentante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RepCreatePayload) => createRepresentante(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: REPS_KEY }),
  });
}

export function useUpdateRepresentante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RepUpdatePayload }) =>
      updateRepresentante(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: REPS_KEY }),
  });
}
