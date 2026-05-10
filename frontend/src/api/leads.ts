import { http } from '@/lib/http';

import {
  type Anexo,
  AnexoSchema,
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
  forma_pagamento?: string;
  valor_entrada?: number;
  percentual_entrada?: number;
}

export async function createLead(payload: LeadCreatePayload): Promise<Lead> {
  const data = await http<unknown>('/api/v1/leads', { method: 'POST', body: payload });
  return LeadSchema.parse(data);
}

export interface LeadUpdatePayload {
  projeto?: string | null;
  valor?: number;
  prioridade?: LeadPrioridade;
  tags?: string[];
  data_ultimo_contato?: string | null;
  tipo_ultimo_contato?: string | null;
  projeto_2d_enviado?: boolean;
  projeto_2d_data?: string | null;
  projeto_3d_enviado?: boolean;
  projeto_3d_data?: string | null;
  probabilidade_override?: number | null;
  valor_entrada?: number | null;
  percentual_entrada?: number | null;
  forma_pagamento?: string | null;
}

export async function updateLead(leadId: string, payload: LeadUpdatePayload): Promise<Lead> {
  const data = await http<unknown>(`/api/v1/leads/${leadId}`, { method: 'PATCH', body: payload });
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

// ── Anexos ─────────────────────────────────────────────────────────
export async function listAnexos(leadId: string): Promise<Anexo[]> {
  const data = await http<unknown>(`/api/v1/anexos/lead/${leadId}`);
  return z.array(AnexoSchema).parse(data);
}

export async function uploadAnexo(leadId: string, file: File): Promise<Anexo> {
  const form = new FormData();
  form.append('file', file);
  const data = await http<unknown>(`/api/v1/anexos/lead/${leadId}`, {
    method: 'POST',
    body: form,
  });
  return AnexoSchema.parse(data);
}

export async function deleteAnexo(anexoId: string): Promise<void> {
  await http<void>(`/api/v1/anexos/${anexoId}`, { method: 'DELETE' });
}

export function getAnexoDownloadUrl(anexoId: string): string {
  return `/api/v1/anexos/${anexoId}/download`;
}
