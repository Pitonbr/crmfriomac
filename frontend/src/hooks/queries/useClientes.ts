import { useQuery } from '@tanstack/react-query';

import { getCliente, listClientes } from '@/api/clientes';

export function useClientes(busca?: string) {
  return useQuery({
    queryKey: ['clientes', { busca }],
    queryFn: () => listClientes(busca),
    staleTime: 60_000,
  });
}

export function useCliente(id: string | undefined) {
  return useQuery({
    queryKey: ['clientes', id],
    queryFn: () => getCliente(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}
