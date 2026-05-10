import { z } from 'zod';

import { http } from '@/lib/http';

import { type DashboardKPIs, DashboardKPIsSchema, LeadProbabilidadeSchema } from './schemas';

export type LeadProbabilidade = z.infer<typeof LeadProbabilidadeSchema>;

export async function getDashboardKpis(): Promise<DashboardKPIs> {
  const data = await http<unknown>('/api/v1/kpis/dashboard');
  return DashboardKPIsSchema.parse(data);
}

export async function getLeadsProbabilidade(): Promise<LeadProbabilidade[]> {
  const data = await http<unknown>('/api/v1/kpis/probabilidade-fechamento');
  return z.array(LeadProbabilidadeSchema).parse(data);
}
