import { http } from '@/lib/http';

import {
  type Lead,
  LeadSchema,
  type LeadPrioridade,
  type LeadStatus,
  type Observacao,
  ObservacaoSchema,
} from './schemas';
import { z } from 'zod';

export interface LeadFilters {
  stage_id?: string;
  representante_id?: string;
  cliente_id?: string;
  status?: LeadStatus;
  prioridade?: LeadPrioridade;
  busca?: string;
  incluir_excluidos?: boolean;
}

function toQuery(f: LeadFilters): string {
  const params = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function listLeads(filters: LeadFilters = {}): Promise<Lead[]> {
  const data = await http<unknown>(`/api/v1/leads${toQuery(filters)}`);
  return z.array(LeadSchema).parse(data);
}

export async function getLead(id: string): Promise<Lead> {
  const data = await http<unknown>(`/api/v1/leads/${id}`);
  return LeadSchema.parse(data);
}

export interface LeadCreatePayload {
  cliente_id: string;
  representante_id?: string;
  stage_id: string;
  projeto?: string;
  valor?: number;
  prioridade?: LeadPrioridade;
  tags?: string[];
}

export async function createLead(payload: LeadCreatePayload): Promise<Lead> {
  const data = await http<unknown>('/api/v1/leads', { method: 'POST', body: payload });
  return LeadSchema.parse(data);
}

export async function moveLeadStage(leadId: string, stage_id: string): Promise<Lead> {
  const data = await http<unknown>(`/api/v1/leads/${leadId}/move-stage`, {
    method: 'POST',
    body: { stage_id },
  });
  return LeadSchema.parse(data);
}

export async function concluirLead(
  leadId: string,
  resultado: 'ganho' | 'perdido',
  motivo_perda?: string,
): Promise<Lead> {
  const data = await http<unknown>(`/api/v1/leads/${leadId}/concluir`, {
    method: 'POST',
    body: { resultado, motivo_perda },
  });
  return LeadSchema.parse(data);
}

export async function deleteLead(leadId: string): Promise<void> {
  await http<void>(`/api/v1/leads/${leadId}`, { method: 'DELETE' });
}

// ── Observações ─────────────────────────────────────────────────────
export async function listObservacoes(leadId: string): Promise<Observacao[]> {
  const data = await http<unknown>(`/api/v1/leads/${leadId}/observacoes`);
  return z.array(ObservacaoSchema).parse(data);
}

export async function addObservacao(leadId: string, texto: string): Promise<Observacao> {
  const data = await http<unknown>(`/api/v1/leads/${leadId}/observacoes`, {
    method: 'POST',
    body: { texto, tipo: 'manual' },
  });
  return ObservacaoSchema.parse(data);
}
