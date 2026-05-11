import { NavLink } from 'react-router-dom';

import { useCurrentUser } from '@/hooks/useAuth';

interface NavItem {
  to: string;
  label: string;
  roles?: readonly string[];
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/dashboard',       label: 'Dashboard' },
  { to: '/kanban',          label: 'Gestão de Leads',    roles: ['master','adm_comercial','representante','adm_operacional','vendedor'] },
  { to: '/orcamentos',      label: 'Orçamentos',         roles: ['master','adm_comercial','representante','adm_operacional','vendedor'] },
  { to: '/clientes',        label: 'Clientes',           roles: ['master','adm_comercial','representante','adm_operacional','vendedor'] },
  { to: '/vendedores',      label: 'Vendedores & Reps.', roles: ['master','adm_comercial','adm_operacional'] },
  { to: '/campanhas',       label: 'Campanhas & Mídias', roles: ['master','adm_comercial','representante','adm_marketing','adm_operacional','vendedor'] },
  { to: '/comissoes',       label: 'Comissões',          roles: ['master','adm_comercial','representante','adm_operacional','vendedor'] },
  { to: '/prazos',          label: 'Prazo de Entrega',   roles: ['master','adm_comercial','representante','adm_operacional','vendedor'] },
  { to: '/relatorio-vendas',label: 'Relatório de Vendas',roles: ['master','adm_comercial','representante','adm_operacional','vendedor'] },
  { to: '/config',          label: 'Configurações',      roles: ['master','representante','vendedor'] },
];

const ROLE_LABEL: Record<string, string> = {
  master:          'Admin Master',
  adm_comercial:   'Admin Comercial',
  adm_marketing:   'Admin Marketing',
  adm_operacional: 'Admin Operacional',
  representante:   'Representante',
  vendedor:        'Vendedor',
};

const ROLE_COLOR: Record<string, string> = {
  master:          '#7c3aed',
  adm_comercial:   '#2563eb',
  adm_marketing:   '#16a34a',
  adm_operacional: '#d97706',
  representante:   '#0891b2',
  vendedor:        '#64748b',
};

export function Sidebar() {
  const { data: user } = useCurrentUser();
  if (!user) return null;

  const visible = NAV_ITEMS.filter(it => !it.roles || it.roles.includes(user.role));

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
          <h2>FRIO<span>MAC</span></h2>
          <p>CRM Comercial 2026</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {visible.map(item => (
            <li key={item.to}>
              <NavLink to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} end>
                {({ isActive }) => (
                  <span aria-current={isActive ? 'page' : undefined}>{item.label}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div style={{ padding:'10px 14px', marginTop:'auto', borderTop:'1px solid var(--border)', fontSize:'.7rem', color:'var(--text-3)', display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ width:8, height:8, borderRadius:'50%', background: ROLE_COLOR[user.role] ?? '#64748b', display:'inline-block', flexShrink:0 }} />
        {ROLE_LABEL[user.role] ?? user.role}
      </div>
    </aside>
  );
}
