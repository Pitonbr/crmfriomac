import { http } from '@/lib/http';

import { type Cliente, ClienteSchema } from './schemas';
import { z } from 'zod';

export async function listClientes(busca?: string): Promise<Cliente[]> {
  const qs = busca ? `?busca=${encodeURIComponent(busca)}` : '';
  const data = await http<unknown>(`/api/v1/clientes${qs}`);
  return z.array(ClienteSchema).parse(data);
}

export async function getCliente(id: string): Promise<Cliente> {
  const data = await http<unknown>(`/api/v1/clientes/${id}`);
  return ClienteSchema.parse(data);
}

export interface ClienteCreatePayload {
  nome_fantasia: string;
  nome_contato?: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  estado?: string;
  canal?: string;
}

export async function createCliente(payload: ClienteCreatePayload): Promise<Cliente> {
  const data = await http<unknown>('/api/v1/clientes', { method: 'POST', body: payload });
  return ClienteSchema.parse(data);
}
