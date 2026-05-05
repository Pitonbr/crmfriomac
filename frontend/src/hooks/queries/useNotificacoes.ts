import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { listNotificacoes, markRead } from '@/api/notificacoes';
import { useWebSocket } from '@/providers/WebSocketProvider';

const KEY = ['notificacoes'] as const;

export function useNotificacoes() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => listNotificacoes({ limit: 50 }),
    staleTime: 30_000,
    refetchInterval: 60_000, // fallback se WS perder evento
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Invalida cache quando WS recebe `notification.new`. */
export function useNotificacoesRealtime(): void {
  const qc = useQueryClient();
  const ws = useWebSocket();

  useEffect(() => {
    return ws.subscribe((evt) => {
      if (evt.type === 'notification.new') {
        qc.invalidateQueries({ queryKey: KEY });
      }
    });
  }, [qc, ws]);
}
