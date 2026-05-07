import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { useChangePassword, useCurrentUser } from '@/hooks/useAuth';

const Schema = z
  .object({
    senha_atual: z.string().min(1, { message: 'Informe a senha atual' }),
    senha_nova: z
      .string()
      .min(8, { message: 'Mínimo 8 caracteres' })
      .refine((s) => /[A-Za-z]/.test(s), { message: 'Inclua ao menos 1 letra' })
      .refine((s) => /\d/.test(s), { message: 'Inclua ao menos 1 número' }),
    senha_confirmacao: z.string().min(1, { message: 'Confirme a senha' }),
  })
  .refine((d) => d.senha_nova === d.senha_confirmacao, {
    message: 'As senhas não conferem',
    path: ['senha_confirmacao'],
  })
  .refine((d) => d.senha_nova !== d.senha_atual, {
    message: 'A nova senha não pode ser igual à atual',
    path: ['senha_nova'],
  });

type FormValues = z.infer<typeof Schema>;

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const change = useChangePassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: { senha_atual: '', senha_nova: '', senha_confirmacao: '' },
  });

  async function onSubmit(values: FormValues) {
    try {
      await change.mutateAsync(values);
      toast.success('Senha alterada. Faça login novamente.');
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao alterar senha';
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
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h1>
            FRIO<span>MAC</span>
          </h1>
          <p>
            {user?.senha_provisoria
              ? 'Primeiro acesso — defina sua senha pessoal'
              : 'Alterar senha'}
          </p>
        </div>

        <form
          className="login-form"
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          autoComplete="off"
          noValidate
        >
          <div>
            <label htmlFor="cp-atual">Senha atual</label>
            <input
              id="cp-atual"
              type="password"
              autoComplete="current-password"
              placeholder="Senha atual"
              aria-invalid={Boolean(errors.senha_atual)}
              {...register('senha_atual')}
            />
            {errors.senha_atual && (
              <p role="alert" style={{ color: 'var(--danger)', fontSize: '.8rem', marginTop: 4 }}>
                {errors.senha_atual.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="cp-nova">Nova senha</label>
            <input
              id="cp-nova"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres com letras e números"
              aria-invalid={Boolean(errors.senha_nova)}
              {...register('senha_nova')}
            />
            {errors.senha_nova && (
              <p role="alert" style={{ color: 'var(--danger)', fontSize: '.8rem', marginTop: 4 }}>
                {errors.senha_nova.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="cp-conf">Confirmar nova senha</label>
            <input
              id="cp-conf"
              type="password"
              autoComplete="new-password"
              placeholder="Repita a nova senha"
              aria-invalid={Boolean(errors.senha_confirmacao)}
              {...register('senha_confirmacao')}
            />
            {errors.senha_confirmacao && (
              <p role="alert" style={{ color: 'var(--danger)', fontSize: '.8rem', marginTop: 4 }}>
                {errors.senha_confirmacao.message}
              </p>
            )}
          </div>

          <button type="submit" className="btn-login" disabled={isSubmitting || change.isPending}>
            {change.isPending ? 'Alterando...' : 'Alterar senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
