import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { useCurrentUser, useLogin } from '@/hooks/useAuth';

const LoginFormSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  senha: z.string().min(1, { message: 'Informe a senha' }),
});

type LoginFormValues = z.infer<typeof LoginFormSchema>;

export function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const { data: user } = useCurrentUser();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: { email: '', senha: '' },
  });

  if (user) {
    const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/dashboard';
    return <Navigate to={from} replace />;
  }

  async function onSubmit(values: LoginFormValues) {
    try {
      const { user: logged } = await login.mutateAsync(values);
      toast.success(`Bem-vindo, ${logged.nome.split(' ')[0]}!`);
      const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao autenticar';
      toast.error(msg);
    }
  }

  return (
    <div id="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">
            <svg
              width="38"
              height="38"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1>
            FRIO<span>MAC</span>
          </h1>
          <p>Sistema de Gestão Comercial CRM</p>
        </div>

        <form
          className="login-form"
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          autoComplete="on"
          noValidate
        >
          <div>
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              placeholder="seu@email.com"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p id="login-email-error" role="alert" style={{ color: 'var(--danger)', fontSize: '.8rem', marginTop: 4 }}>
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="login-senha">Senha</label>
            <input
              id="login-senha"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={Boolean(errors.senha)}
              aria-describedby={errors.senha ? 'login-senha-error' : undefined}
              {...register('senha')}
            />
            {errors.senha && (
              <p id="login-senha-error" role="alert" style={{ color: 'var(--danger)', fontSize: '.8rem', marginTop: 4 }}>
                {errors.senha.message}
              </p>
            )}
          </div>

          <button type="submit" className="btn-login" disabled={isSubmitting || login.isPending}>
            {login.isPending ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
