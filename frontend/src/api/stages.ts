import { http } from '@/lib/http';

import { type Stage, StageSchema } from './schemas';
import { z } from 'zod';

export async function listStages(): Promise<Stage[]> {
  const data = await http<unknown>('/api/v1/stages');
  return z.array(StageSchema).parse(data);
}
