/**
 * Sprint 1: tela de boas-vindas mostrando que o stack subiu.
 * Sprint 2+: substituída pelo RouterProvider + AppShell.
 */
export default function App() {
  return (
    <main className="welcome">
      <div className="welcome-card">
        <div className="welcome-logo" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <h1 className="welcome-title">
          FRIO<span>MAC</span>
        </h1>
        <p className="welcome-subtitle">CRM Comercial — v2.0</p>
        <p className="welcome-status">
          ✓ Frontend React + Vite ativo
        </p>
        <p className="welcome-hint">
          Refatoração em construção. Próximo sprint: autenticação e multi-tenancy.
        </p>
      </div>
    </main>
  );
}
