import { http } from '@/lib/http';

import { type Anexo, AnexoSchema, type Representante, RepresentanteSchema } from './schemas';
import { z } from 'zod';

export async function listRepresentantes(): Promise<Representante[]> {
  const data = await http<unknown>('/api/v1/representantes');
  return z.array(RepresentanteSchema).parse(data);
}

export async function listRepresentantesAll(): Promise<Representante[]> {
  const data = await http<unknown>('/api/v1/representantes?incluir_inativos=true');
  return z.array(RepresentanteSchema).parse(data);
}

// ── Payload types (todas as 5 abas) ──────────────────────────────────────
export interface RepFullPayload {
  // Identificação
  nome: string;
  nome_fantasia?: string | null;
  razao_social?: string | null;
  cnpj?: string | null;
  canal: 'canal_proprio' | 'representante';
  comissao_pct?: number;
  // Contato
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  // Financeiro
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  pix?: string | null;
  obs_financeiro?: string | null;
  // Redes Sociais
  instagram?: string | null;
  linkedin?: string | null;
  tiktok?: string | null;
  website?: string | null;
  outras_redes?: string | null;
}

export type RepCreatePayload = RepFullPayload;

export interface RepUpdatePayload extends Partial<RepFullPayload> {
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

// ── Documentos (Anexos) ───────────────────────────────────────────────────
export async function listAnexosRep(repId: string): Promise<Anexo[]> {
  const data = await http<unknown>(`/api/v1/anexos/representante/${repId}`);
  return z.array(AnexoSchema).parse(data);
}

export function uploadAnexoRep(repId: string, file: File): Promise<Anexo> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    xhr.open('POST', `/api/v1/anexos/representante/${repId}`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(AnexoSchema.parse(JSON.parse(xhr.responseText))); }
        catch { reject(new Error('Resposta inválida')); }
      } else {
        try { reject(new Error((JSON.parse(xhr.responseText) as { detail?: string }).detail ?? `Erro ${xhr.status}`)); }
        catch { reject(new Error(`Erro ${xhr.status}`)); }
      }
    };
    xhr.onerror = () => reject(new Error('Erro de rede'));
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}
