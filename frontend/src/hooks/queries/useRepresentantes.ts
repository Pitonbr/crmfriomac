import { useQuery } from '@tanstack/react-query';

import { listRepresentantes } from '@/api/representantes';

export const REPS_KEY = ['representantes'] as const;

export function useRepresentantes() {
  return useQuery({
    queryKey: REPS_KEY,
    queryFn: listRepresentantes,
    staleTime: 5 * 60 * 1000,
  });
}
