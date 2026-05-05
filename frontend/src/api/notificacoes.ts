import { http } from '@/lib/http';

import { type NotificacoesUnread, NotificacoesUnreadSchema } from './schemas';

export async function listNotificacoes(opts: { onlyUnread?: boolean; limit?: number } = {}): Promise<NotificacoesUnread> {
  const params = new URLSearchParams();
  if (opts.onlyUnread) params.set('only_unread', 'true');
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  const data = await http<unknown>(`/api/v1/notificacoes${qs ? `?${qs}` : ''}`);
  return NotificacoesUnreadSchema.parse(data);
}

export async function markRead(id: string): Promise<void> {
  await http<void>(`/api/v1/notificacoes/${id}/read`, { method: 'POST' });
}
