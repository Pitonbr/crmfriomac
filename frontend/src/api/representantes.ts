import { http } from '@/lib/http';

import { type Representante, RepresentanteSchema } from './schemas';
import { z } from 'zod';

export async function listRepresentantes(): Promise<Representante[]> {
  const data = await http<unknown>('/api/v1/representantes');
  return z.array(RepresentanteSchema).parse(data);
}
