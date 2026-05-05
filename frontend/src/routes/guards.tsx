import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useCurrentUser } from '@/hooks/useAuth';

import type { UserRole } from '@/api/schemas';

/** Redireciona para /login se não autenticado. Mostra splash enquanto valida. */
export function RequireAuth() {
  const { data: user, isPending, isError } = useCurrentUser();
  const location = useLocation();

  if (isPending) {
    return <AuthSplash label="Verificando sessão..." />;
  }
  if (isError || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

/** Restringe rota a um conjunto de papéis. Use dentro de <RequireAuth>. */
export function RoleGuard({ allowed }: { allowed: readonly UserRole[] }) {
  const { data: user } = useCurrentUser();
  if (!user) return null;
  if (!allowed.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

function AuthSplash({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        color: 'var(--text-2)',
        fontSize: '0.95rem',
      }}
    >
      {label}
    </div>
  );
}
