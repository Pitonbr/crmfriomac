import { http } from '@/lib/http';

import {
  type Orcamento,
  OrcamentoSchema,
  type Comissao,
  ComissaoSchema,
  type Entrega,
  EntregaSchema,
} from './schemas';
import { z } from 'zod';

// ── Orçamentos ──────────────────────────────────────────────────────
export async function listOrcamentos(): Promise<Orcamento[]> {
  const data = await http<unknown>('/api/v1/orcamentos');
  return z.array(OrcamentoSchema).parse(data);
}

// ── Comissões ───────────────────────────────────────────────────────
export async function listComissoes(): Promise<Comissao[]> {
  const data = await http<unknown>('/api/v1/comissoes');
  return z.array(ComissaoSchema).parse(data);
}

// ── Entregas ────────────────────────────────────────────────────────
export async function listEntregas(): Promise<Entrega[]> {
  const data = await http<unknown>('/api/v1/entregas');
  return z.array(EntregaSchema).parse(data);
}

export interface EntregaCreatePayload {
  lead_id: string;
  prazo_estimado?: string | null;
  status?: 'planejada' | 'em_producao' | 'entregue' | 'atrasada';
  observacoes?: string | null;
}

export interface EntregaUpdatePayload {
  status?: 'planejada' | 'em_producao' | 'entregue' | 'atrasada';
  prazo_estimado?: string | null;
  prazo_real?: string | null;
  satisfacao?: number | null;
  retrabalho?: boolean;
  retrabalho_desc?: string | null;
  observacoes?: string | null;
}

export async function createEntrega(payload: EntregaCreatePayload): Promise<Entrega> {
  const data = await http<unknown>('/api/v1/entregas', { method: 'POST', body: payload });
  return EntregaSchema.parse(data);
}

export async function updateEntrega(id: string, payload: EntregaUpdatePayload): Promise<Entrega> {
  const data = await http<unknown>(`/api/v1/entregas/${id}`, { method: 'PATCH', body: payload });
  return EntregaSchema.parse(data);
}
