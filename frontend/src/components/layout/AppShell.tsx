import { Outlet } from 'react-router-dom';

import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

/** Shell mínimo do Sprint 2 — Sprint 4 expande sidebar com ícones por módulo. */
export function AppShell() {
  return (
    <div id="app">
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      <Sidebar />
      <div className="main-content" id="main-content">
        <TopHeader />
        <main className="page-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
