import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { DashboardPlaceholder } from '@/features/dashboard/DashboardPlaceholder';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { KanbanPage } from '@/features/kanban/KanbanPage';
import { LeadModal } from '@/features/kanban/LeadModal';
import { NotImplementedPage } from '@/features/NotImplementedPage';

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
          { path: 'dashboard', element: <DashboardPlaceholder /> },
          {
            path: 'kanban',
            element: <KanbanPage />,
            children: [
              // Modal route — abre o LeadModal sobre o board ao acessar /kanban/leads/:leadId
              { path: 'leads/:leadId', element: <LeadModal /> },
            ],
          },
          {
            path: 'orcamentos',
            element: <NotImplementedPage titulo="Orçamentos" sprint="Sprint 4" />,
          },
          {
            path: 'clientes',
            element: <NotImplementedPage titulo="Clientes" sprint="Sprint 4" />,
          },
          {
            path: 'campanhas',
            element: <NotImplementedPage titulo="Campanhas & Mídias" sprint="Sprint 4" />,
          },
          {
            path: 'comissoes',
            element: <NotImplementedPage titulo="Comissões" sprint="Sprint 4" />,
          },
          {
            path: 'prazos',
            element: <NotImplementedPage titulo="Prazo de Entrega" sprint="Sprint 4" />,
          },
          {
            element: <RoleGuard allowed={['master']} />,
            children: [
              {
                path: 'vendedores',
                element: (
                  <NotImplementedPage titulo="Vendedores & Representantes" sprint="Sprint 4" />
                ),
              },
              {
                path: 'config',
                element: <NotImplementedPage titulo="Configurações" sprint="Sprint 4" />,
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
