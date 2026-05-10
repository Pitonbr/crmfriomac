import { useQuery } from '@tanstack/react-query';

import { getDashboardKpis, getLeadsProbabilidade } from '@/api/kpis';

export function useDashboardKpis() {
  return useQuery({
    queryKey: ['kpis', 'dashboard'],
    queryFn: getDashboardKpis,
    staleTime: 30_000,
  });
}

export function useLeadsProbabilidade() {
  return useQuery({
    queryKey: ['kpis', 'probabilidade-fechamento'],
    queryFn: getLeadsProbabilidade,
    staleTime: 5 * 60_000,
  });
}
