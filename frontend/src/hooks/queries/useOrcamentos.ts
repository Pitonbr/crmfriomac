import { useQuery } from '@tanstack/react-query';

import { listComissoes, listEntregas, listOrcamentos } from '@/api/orcamentos';

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

export function useEntregas() {
  return useQuery({
    queryKey: ['entregas'],
    queryFn: listEntregas,
    staleTime: 60_000,
  });
}
