/**
 * WebSocket singleton — abre 1 conexão por sessão, reconnect com backoff,
 * heartbeat ping a cada 25s.
 *
 * Não fala HTTP nem cookies diretamente — o navegador anexa cookies same-origin
 * automaticamente no handshake.
 */
import { env } from './env';

export interface WsEnvelope {
  type: string;
  tenantId: string;
  actorId?: string | null;
  actorNome?: string | null;
  timestamp: string;
  payload: Record<string, unknown>;
}

type Handler = (event: WsEnvelope) => void;

class WsClient {
  private socket: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private reconnectAttempts = 0;
  private heartbeat: number | null = null;
  private shouldReconnect = false;

  connect(): void {
    if (this.socket && this.socket.readyState <= 1) return;
    this.shouldReconnect = true;
    this._open();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this._stopHeartbeat();
    if (this.socket) {
      this.socket.close(1000, 'client disconnect');
      this.socket = null;
    }
    this.reconnectAttempts = 0;
  }

  subscribe(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  private _open(): void {
    const url = `${env.VITE_WS_URL}/ws`;
    try {
      this.socket = new WebSocket(url);
    } catch {
      this._scheduleReconnect();
      return;
    }

    this.socket.addEventListener('open', () => {
      this.reconnectAttempts = 0;
      this._startHeartbeat();
    });

    this.socket.addEventListener('message', (ev) => {
      if (typeof ev.data !== 'string') return;
      if (ev.data === 'pong') return;
      try {
        const msg = JSON.parse(ev.data) as WsEnvelope;
        this.handlers.forEach((h) => {
          try {
            h(msg);
          } catch {
            // ignore handler errors
          }
        });
      } catch {
        // payload não-JSON
      }
    });

    this.socket.addEventListener('close', () => {
      this._stopHeartbeat();
      this.socket = null;
      if (this.shouldReconnect) {
        this._scheduleReconnect();
      }
    });

    this.socket.addEventListener('error', () => {
      // close será disparado em seguida
    });
  }

  private _startHeartbeat(): void {
    this._stopHeartbeat();
    this.heartbeat = window.setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        try {
          this.socket.send('ping');
        } catch {
          // ignore
        }
      }
    }, 25_000);
  }

  private _stopHeartbeat(): void {
    if (this.heartbeat !== null) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }

  private _scheduleReconnect(): void {
    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * 2 ** Math.min(this.reconnectAttempts, 5), 30_000);
    setTimeout(() => {
      if (this.shouldReconnect) this._open();
    }, delay);
  }
}

export const wsClient = new WsClient();
