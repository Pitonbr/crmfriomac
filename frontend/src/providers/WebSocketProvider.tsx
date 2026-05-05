import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

import { wsClient, type WsEnvelope } from '@/lib/ws';
import { useAuthStore } from '@/store/authStore';

interface WsApi {
  subscribe: (handler: (e: WsEnvelope) => void) => () => void;
}

const WsContext = createContext<WsApi | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) {
      wsClient.disconnect();
      return;
    }
    wsClient.connect();
    return () => {
      // não desconecta no cleanup do Provider (apenas no logout via store)
    };
  }, [user]);

  const api = useMemo<WsApi>(
    () => ({
      subscribe: (h) => wsClient.subscribe(h),
    }),
    [],
  );

  return <WsContext.Provider value={api}>{children}</WsContext.Provider>;
}

export function useWebSocket(): WsApi {
  const ctx = useContext(WsContext);
  if (!ctx) throw new Error('useWebSocket fora de WebSocketProvider');
  return ctx;
}
