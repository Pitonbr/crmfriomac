import { useNavigate } from 'react-router-dom';

import { useCurrentUser, useLogout } from '@/hooks/useAuth';

import { NotificationBell } from './NotificationBell';
import './notification-bell.css';

const ROLE_LABEL: Record<string, string> = {
  master: 'Administrador',
  vendedor: 'Vendedor',
  representante: 'Representante',
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
    user.nome
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

  return (
    <header className="top-header">
      <div>
        <div className="page-title">Friomac CRM</div>
        <div className="page-subtitle">Bem-vindo, {user.nome.split(' ')[0]}</div>
      </div>

      <div className="header-spacer" />

      <div className="header-actions">
        <NotificationBell />

        <div className="header-user" aria-label="Usuário corrente">
          <div className="user-avatar" style={{ width: 30, height: 30, fontSize: '.75rem' }}>
            {initials}
          </div>
          <div className="header-user-info">
            <strong className="header-user-name">{user.nome.split(' ')[0]}</strong>
            <span>{ROLE_LABEL[user.role] ?? user.role}</span>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            void handleLogout();
          }}
          disabled={logout.isPending}
          aria-label="Sair do sistema"
        >
          {logout.isPending ? 'Saindo...' : 'Sair'}
        </button>
      </div>
    </header>
  );
}
