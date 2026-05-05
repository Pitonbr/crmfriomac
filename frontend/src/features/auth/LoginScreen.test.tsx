import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { LoginScreen } from './LoginScreen';

// Mock do hook de auth
vi.mock('@/hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: null, isPending: false, isError: false }),
  useLogin: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ user: { nome: 'Admin' } }),
    isPending: false,
  }),
}));

function renderLogin() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/login']}>
        <LoginScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginScreen', () => {
  it('renderiza o formulário com campos e botão', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('mostra erro de validação quando email é inválido', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText(/email/i), 'nao-eh-email');
    await user.type(screen.getByLabelText(/senha/i), 'qualquer');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText(/email inválido/i)).toBeInTheDocument();
  });

  it('mostra erro quando senha está vazia', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText(/informe a senha/i)).toBeInTheDocument();
  });
});
