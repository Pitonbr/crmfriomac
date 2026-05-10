import * as Popover from '@radix-ui/react-popover';
import { Mail, MailOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useMarkRead, useNotificacoes, useNotificacoesRealtime } from '@/hooks/queries/useNotificacoes';
import { formatRelative } from '@/lib/formatters';

import { Icon } from '../ui/Icon';
import './notification-bell.css';

type TipoCfg = { icon: string; color: string; bg: string; fallbackLink: string };
const DEFAULT_CFG: TipoCfg = { icon: '📋', color: '#64748B', bg: '#F1F5F9', fallbackLink: '/dashboard' };

// ── Configuração visual por tipo ─────────────────────────────────
const TIPO_CONFIG: Record<string, TipoCfg> = {
  sla_estourando:  { icon: '⏰', color: '#D97706', bg: '#FEF3C7', fallbackLink: '/kanban' },
  sla_estourado:   { icon: '⏰', color: '#DC2626', bg: '#FEE2E2', fallbackLink: '/kanban' },
  lead_ganho:      { icon: '🏆', color: '#16A34A', bg: '#DCFCE7', fallbackLink: '/kanban' },
  lead_perdido:    { icon: '❌', color: '#DC2626', bg: '#FEE2E2', fallbackLink: '/kanban' },
  comissao_nova:   { icon: '💰', color: '#0B2D54', bg: '#EFF6FF', fallbackLink: '/comissoes' },
  entrega_proxima: { icon: '📦', color: '#0D9488', bg: '#CCFBF1', fallbackLink: '/prazos' },
  sistema:         { icon: '⚙️', color: '#64748B', bg: '#F1F5F9', fallbackLink: '/config' },
};

export function NotificationBell() {
  useNotificacoesRealtime();
  const { data } = useNotificacoes();
  const markRead = useMarkRead();
  const navigate = useNavigate();

  const unread   = data?.unread ?? 0;
  const items    = data?.items ?? [];
  const naoLidas = items.filter(n => !n.lida_em);
  const lidas    = items.filter(n => !!n.lida_em).slice(0, 5);

  const handleClick = (id: string, link: string | null | undefined, tipo: string) => {
    markRead.mutate(id);
    navigate(link ?? TIPO_CONFIG[tipo]?.fallbackLink ?? '/dashboard');
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Mensagens${unread ? ` (${unread} não lidas)` : ''}`}
          className="bell-btn"
          title="Mensagens e alertas"
        >
          <Icon icon={unread > 0 ? MailOpen : Mail} size={18} />
          {unread > 0 && (
            <span className="bell-badge" aria-hidden>{unread > 99 ? '99+' : unread}</span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="end"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: 380, maxHeight: 520, overflow: 'hidden', zIndex: 9999 }}
        >
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.1rem' }}>✉️</span>
              <strong style={{ fontSize: '.95rem', color: 'var(--text-1)' }}>Mensagens & Alertas</strong>
            </div>
            <span style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>
              {unread > 0 ? `${unread} não lida${unread === 1 ? '' : 's'}` : 'Tudo lido ✓'}
            </span>
          </div>

          {/* Lista */}
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {naoLidas.length > 0 && (
              <>
                <SectionLabel label="Não lidas" />
                {naoLidas.map(n => {
                  const cfg: TipoCfg = TIPO_CONFIG[n.tipo] ?? DEFAULT_CFG;
                  return <NotifItem key={n.id} n={n} cfg={cfg} lida={false} onClick={() => handleClick(n.id, n.link, n.tipo)} />;
                })}
              </>
            )}
            {lidas.length > 0 && (
              <>
                <SectionLabel label="Anteriores" />
                {lidas.map(n => {
                  const cfg: TipoCfg = TIPO_CONFIG[n.tipo] ?? DEFAULT_CFG;
                  return <NotifItem key={n.id} n={n} cfg={cfg} lida onClick={() => handleClick(n.id, n.link, n.tipo)} />;
                })}
              </>
            )}
            {items.length === 0 && (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '.85rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>✉️</div>
                Sem mensagens ou alertas.
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>{items.length} mensagem{items.length !== 1 ? 's' : ''}</span>
            <button type="button" onClick={() => navigate('/kanban')}
              style={{ fontSize: '.78rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Ir para Leads →
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ padding: '8px 16px 4px', fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)' }}>
      {label}
    </div>
  );
}

interface NotifItemProps {
  n: { titulo: string; mensagem: string; criado_em: string };
  cfg: TipoCfg;
  lida: boolean;
  onClick: () => void;
}

function NotifItem({ n, cfg, lida, onClick }: NotifItemProps) {
  return (
    <button type="button" onClick={onClick} style={{
      width: '100%', padding: '11px 16px', textAlign: 'left', cursor: 'pointer',
      background: lida ? 'transparent' : 'var(--surface-2)',
      borderBottom: '1px solid var(--border)',
      borderLeft: lida ? '3px solid transparent' : `3px solid ${cfg.color}`,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
        {cfg.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '.84rem', fontWeight: lida ? 500 : 700, color: 'var(--text-1)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {n.titulo}
        </div>
        <div style={{ fontSize: '.78rem', color: 'var(--text-2)', marginBottom: 3 }}>{n.mensagem}</div>
        <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>{formatRelative(n.criado_em)}</div>
      </div>
      {!lida && <div style={{ width: 7, height: 7, background: cfg.color, borderRadius: '50%', flexShrink: 0, marginTop: 5 }} />}
    </button>
  );
}
