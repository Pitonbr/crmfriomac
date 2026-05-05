import { NavLink } from 'react-router-dom';

import { useCurrentUser } from '@/hooks/useAuth';

interface NavItem {
  to: string;
  label: string;
  roles?: readonly ('master' | 'vendedor' | 'representante')[];
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/kanban', label: 'Gestão de Leads' },
  { to: '/orcamentos', label: 'Orçamentos' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/vendedores', label: 'Vendedores & Reps.', roles: ['master'] },
  { to: '/campanhas', label: 'Campanhas & Mídias', roles: ['master', 'vendedor'] },
  { to: '/comissoes', label: 'Comissões' },
  { to: '/prazos', label: 'Prazo de Entrega' },
  { to: '/config', label: 'Configurações', roles: ['master'] },
];

export function Sidebar() {
  const { data: user } = useCurrentUser();
  if (!user) return null;

  const visible = NAV_ITEMS.filter((it) => !it.roles || it.roles.includes(user.role));

  return (
    <aside className="sidebar" id="sidebar" aria-label="Navegação principal">
      <div className="sidebar-header">
        <div className="sidebar-logo" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div className="sidebar-title">
          <h2>
            FRIO<span>MAC</span>
          </h2>
          <p>CRM Comercial 2026</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {visible.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                end
              >
                {({ isActive }) => (
                  <>
                    <span aria-current={isActive ? 'page' : undefined}>{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
