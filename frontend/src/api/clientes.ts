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
