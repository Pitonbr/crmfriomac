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
