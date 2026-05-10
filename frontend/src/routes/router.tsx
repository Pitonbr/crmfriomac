import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { CampanhasPage } from '@/features/campanhas/CampanhasPage';
import { ClientesPage } from '@/features/clientes/ClientesPage';
import { ClientModal } from '@/features/clientes/ClientModal';
import { ComissoesPage } from '@/features/comissoes/ComissoesPage';
import { ConfigPage } from '@/features/config/ConfigPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { KanbanPage } from '@/features/kanban/KanbanPage';
import { LeadModal } from '@/features/kanban/LeadModal';
import { OrcamentosPage } from '@/features/orcamentos/OrcamentosPage';
import { PrazosPage } from '@/features/prazos/PrazosPage';
import { RelatorioVendasPage } from '@/features/relatorio-vendas/RelatorioVendasPage';
import { VendedoresPage } from '@/features/vendedores/VendedoresPage';

import { RequireAuth } from './guards';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginScreen />,
  },
  {
    // Autenticado mas NÃO usa AppShell (não mostra sidebar com a senha provisória)
    element: <RequireAuth />,
    children: [
      { path: '/change-password', element: <ChangePasswordPage /> },
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
          {
            path: 'clientes',
            element: <ClientesPage />,
            children: [{ path: ':clienteId', element: <ClientModal /> }],
          },
          { path: 'campanhas', element: <CampanhasPage /> },
          { path: 'relatorio-vendas', element: <RelatorioVendasPage /> },
          { path: 'comissoes', element: <ComissoesPage /> },
          { path: 'prazos', element: <PrazosPage /> },
          { path: 'vendedores', element: <VendedoresPage /> },
          { path: 'config', element: <ConfigPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
