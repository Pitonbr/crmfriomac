import { http } from '@/lib/http';

import { type DashboardKPIs, DashboardKPIsSchema } from './schemas';

export async function getDashboardKpis(): Promise<DashboardKPIs> {
  const data = await http<unknown>('/api/v1/kpis/dashboard');
  return DashboardKPIsSchema.parse(data);
}
