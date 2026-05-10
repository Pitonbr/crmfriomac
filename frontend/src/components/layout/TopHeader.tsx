import * as Popover from '@radix-ui/react-popover';
import { useNavigate } from 'react-router-dom';

import { useCurrentUser, useLogout } from '@/hooks/useAuth';

import { NotificationBell } from './NotificationBell';
import './notification-bell.css';

const ROLE_LABEL: Record<string, string> = {
  master: 'Administrador',
  adm_geral: 'ADM Geral',
  vendedor: 'Vendedor',
  representante: 'Representante',
  administrativo: 'Administrativo',
  financeiro: 'Financeiro',
};

const ROLE_COLOR: Record<string, string> = {
  master:       'var(--danger, #DC2626)',
  adm_geral:    '#D97706',
  vendedor:     'var(--primary)',
  representante:'var(--purple, #7C3AED)',
};

export function TopHeader() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  const initials =
    user.avatar ??
    user.nome.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  const avatarBg = ROLE_COLOR[user.role] ?? 'var(--primary)';

  return (
    <header className="top-header">
      <div>
        <div className="page-title">Friomac CRM</div>
        <div className="page-subtitle">Bem-vindo, {user.nome.split(' ')[0]}</div>
      </div>

      <div className="header-spacer" />

      <div className="header-actions">
        {/* Envelope — mensagens e alertas */}
        <NotificationBell />

        {/* Avatar — Popover de conta */}
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label="Menu da conta"
              style={{
                cursor: 'pointer', background: 'none',
                border: '1.5px solid var(--border)', borderRadius: 24,
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 12px 5px 5px', transition: 'all .18s',
              }}
            >
              <div className="user-avatar" style={{ width: 30, height: 30, fontSize: '.75rem', background: avatarBg, flexShrink: 0 }}>
                {initials}
              </div>
              <div className="header-user-info">
                <strong className="header-user-name">{user.nome.split(' ')[0]}</strong>
                <span>{ROLE_LABEL[user.role] ?? user.role}</span>
              </div>
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content sideOffset={8} align="end" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: 280, zIndex: 9999, overflow: 'hidden' }}>
              {/* Perfil header */}
              <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.nome}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-3)', marginTop: 2 }}>{ROLE_LABEL[user.role] ?? user.role}</div>
                  {user.email && <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>}
                </div>
              </div>

              {/* Menu ações */}
              <div style={{ padding: 6 }}>
                <MenuBtn icon="⚙️" label="Configurações" onClick={() => navigate('/config')} />
                <MenuBtn icon="🔒" label="Alterar Senha"  onClick={() => navigate('/change-password')} />
              </div>

              {/* Sair */}
              <div style={{ padding: '4px 6px 8px', borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  disabled={logout.isPending}
                  onClick={() => { void handleLogout(); }}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: '.85rem', fontWeight: 600, color: 'var(--danger)', textAlign: 'left' }}
                >
                  <span>🚪</span>
                  {logout.isPending ? 'Saindo...' : 'Sair do sistema'}
                </button>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </header>
  );
}

function MenuBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontSize: '.85rem', fontWeight: 500, color: 'var(--text-1)', textAlign: 'left' }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
    >
      <span style={{ fontSize: '1rem' }}>{icon}</span>
      {label}
    </button>
  );
}
