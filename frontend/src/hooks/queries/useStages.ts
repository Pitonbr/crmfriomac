import { useQuery } from '@tanstack/react-query';

import { listStages } from '@/api/stages';

export const STAGES_KEY = ['stages'] as const;

export function useStages() {
  return useQuery({
    queryKey: STAGES_KEY,
    queryFn: listStages,
    staleTime: 10 * 60 * 1000, // 10 min — stages mudam raramente
  });
}
