import { useQuery } from '@tanstack/react-query';

import { getDashboardKpis } from '@/api/kpis';

export function useDashboardKpis() {
  return useQuery({
    queryKey: ['kpis', 'dashboard'],
    queryFn: getDashboardKpis,
    staleTime: 30_000,
  });
}
