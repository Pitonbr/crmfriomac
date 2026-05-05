/**
 * fetch wrapper — sempre `credentials: 'include'` para cookie HttpOnly.
 *
 * - Lança `ApiError` em qualquer não-2xx (status, code, message, details).
 * - Refresh automático em 401: chama POST /api/v1/auth/refresh e repete a request UMA vez.
 * - Single-flight: múltiplas requests simultâneas com 401 compartilham UMA promessa de refresh.
 */
import { env } from './env';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HttpRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Não tentar refresh em 401 (usado pelo próprio /refresh) */
  skipRefresh?: boolean;
}

let refreshInFlight: Promise<boolean> | null = null;

/** Tenta refresh do token. Retorna true se sucesso. Single-flight. */
async function refreshToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${env.VITE_API_BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      // Permite novo refresh após este completar
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();

  return refreshInFlight;
}

async function parseError(res: Response): Promise<ApiError> {
  let detail: unknown = undefined;
  let message = res.statusText;
  try {
    const body = (await res.json()) as { detail?: unknown };
    detail = body.detail;
    if (typeof detail === 'string') message = detail;
  } catch {
    // body sem JSON — mantém statusText
  }
  return new ApiError(res.status, String(res.status), message, detail);
}

async function doFetch(path: string, options: HttpRequestOptions): Promise<Response> {
  const url = path.startsWith('http') ? path : `${env.VITE_API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };

  let body: BodyInit | undefined;
  if (options.body !== undefined && options.body !== null) {
    if (options.body instanceof FormData) {
      body = options.body;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
  }

  return fetch(url, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers,
    body,
    signal: options.signal,
  });
}

/** Cliente HTTP principal — tipado, com refresh transparente em 401. */
export async function http<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
  let res = await doFetch(path, options);

  if (res.status === 401 && !options.skipRefresh) {
    const refreshed = await refreshToken();
    if (refreshed) {
      res = await doFetch(path, options);
    }
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}
