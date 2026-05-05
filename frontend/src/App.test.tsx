import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from './App';

describe('App (Sprint 1)', () => {
  it('renderiza a tela de boas-vindas', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/FRIO.*MAC/);
    expect(screen.getByText(/CRM Comercial — v2\.0/i)).toBeInTheDocument();
  });

  it('mostra status do frontend ativo', () => {
    render(<App />);
    expect(screen.getByText(/Frontend React \+ Vite ativo/i)).toBeInTheDocument();
  });
});
