import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type ClienteCreatePayload, createCliente, getCliente, listClientes } from '@/api/clientes';

const CLIENTES_KEY = ['clientes'] as const;

export function useClientes(busca?: string) {
  return useQuery({
    queryKey: [...CLIENTES_KEY, { busca }],
    queryFn: () => listClientes(busca),
    staleTime: 60_000,
  });
}

export function useCliente(id: string | undefined) {
  return useQuery({
    queryKey: [...CLIENTES_KEY, id],
    queryFn: () => getCliente(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ClienteCreatePayload) => createCliente(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENTES_KEY }),
  });
}
