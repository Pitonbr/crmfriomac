import * as Popover from '@radix-ui/react-popover';
import { Bell, BellRing } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useMarkRead, useNotificacoes, useNotificacoesRealtime } from '@/hooks/queries/useNotificacoes';
import { formatRelative } from '@/lib/formatters';

import { Icon } from '../ui/Icon';

export function NotificationBell() {
  useNotificacoesRealtime();
  const { data } = useNotificacoes();
  const markRead = useMarkRead();
  const navigate = useNavigate();

  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  const handleClick = (id: string, link?: string | null) => {
    markRead.mutate(id);
    if (link) {
      navigate(link);
    }
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Notificações${unread ? ` (${unread} não lidas)` : ''}`}
          className="bell-btn"
        >
          <Icon icon={unread > 0 ? BellRing : Bell} size={18} />
          {unread > 0 && (
            <span className="bell-badge" aria-hidden>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="bell-pop"
          sideOffset={8}
          align="end"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            width: 360,
            maxHeight: 480,
            overflow: 'hidden',
            zIndex: 9999,
          }}
        >
          <header style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <strong style={{ fontSize: '.95rem' }}>Notificações</strong>
            <span style={{ fontSize: '.75rem', color: 'var(--text-3)', marginLeft: 8 }}>
              {data ? `${unread} não lida${unread === 1 ? '' : 's'}` : '...'}
            </span>
          </header>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              maxHeight: 380,
              overflowY: 'auto',
            }}
          >
            {items.length === 0 && (
              <li style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: '.85rem' }}>
                Sem notificações.
              </li>
            )}
            {items.map((n) => {
              const unreadStyle = n.lida_em
                ? {}
                : { background: 'var(--surface-2)', borderLeft: '3px solid var(--primary)' };
              return (
                <li key={n.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => handleClick(n.id, n.link)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      ...unreadStyle,
                    }}
                  >
                    <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text-1)' }}>
                      {n.titulo}
                    </div>
                    <div style={{ fontSize: '.8rem', color: 'var(--text-2)', marginTop: 2 }}>
                      {n.mensagem}
                    </div>
                    <div style={{ fontSize: '.7rem', color: 'var(--text-3)', marginTop: 4 }}>
                      {formatRelative(n.criado_em)}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
