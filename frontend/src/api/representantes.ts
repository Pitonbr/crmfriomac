import { http } from '@/lib/http';

import { type Representante, RepresentanteSchema } from './schemas';
import { z } from 'zod';

export async function listRepresentantes(): Promise<Representante[]> {
  const data = await http<unknown>('/api/v1/representantes');
  return z.array(RepresentanteSchema).parse(data);
}

export async function listRepresentantesAll(): Promise<Representante[]> {
  const data = await http<unknown>('/api/v1/representantes?incluir_inativos=true');
  return z.array(RepresentanteSchema).parse(data);
}

export interface RepCreatePayload {
  nome: string;
  canal: 'canal_proprio' | 'representante';
  comissao_pct?: number;
  cidade?: string | null;
  estado?: string | null;
  email?: string | null;
  telefone?: string | null;
}

export interface RepUpdatePayload {
  nome?: string;
  canal?: 'canal_proprio' | 'representante';
  comissao_pct?: number;
  cidade?: string | null;
  estado?: string | null;
  email?: string | null;
  telefone?: string | null;
  ativo?: boolean;
}

export async function createRepresentante(payload: RepCreatePayload): Promise<Representante> {
  const data = await http<unknown>('/api/v1/representantes', { method: 'POST', body: payload });
  return RepresentanteSchema.parse(data);
}

export async function updateRepresentante(id: string, payload: RepUpdatePayload): Promise<Representante> {
  const data = await http<unknown>(`/api/v1/representantes/${id}`, { method: 'PATCH', body: payload });
  return RepresentanteSchema.parse(data);
}
