import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { CampanhasPlaceholder } from '@/features/campanhas/CampanhasPlaceholder';
import { ClientesPage } from '@/features/clientes/ClientesPage';
import { ComissoesPage } from '@/features/comissoes/ComissoesPage';
import { ConfigPage } from '@/features/config/ConfigPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { KanbanPage } from '@/features/kanban/KanbanPage';
import { LeadModal } from '@/features/kanban/LeadModal';
import { OrcamentosPage } from '@/features/orcamentos/OrcamentosPage';
import { PrazosPage } from '@/features/prazos/PrazosPage';
import { VendedoresPage } from '@/features/vendedores/VendedoresPage';

import { RequireAuth, RoleGuard } from './guards';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginScreen />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          {
            path: 'kanban',
            element: <KanbanPage />,
            children: [{ path: 'leads/:leadId', element: <LeadModal /> }],
          },
          { path: 'orcamentos', element: <OrcamentosPage /> },
          { path: 'clientes', element: <ClientesPage /> },
          { path: 'campanhas', element: <CampanhasPlaceholder /> },
          { path: 'comissoes', element: <ComissoesPage /> },
          { path: 'prazos', element: <PrazosPage /> },
          {
            element: <RoleGuard allowed={['master']} />,
            children: [
              { path: 'vendedores', element: <VendedoresPage /> },
              { path: 'config', element: <ConfigPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
