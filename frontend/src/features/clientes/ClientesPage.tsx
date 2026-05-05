import { useState } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useClientes } from '@/hooks/queries/useClientes';
import { formatCNPJ, formatTelefone } from '@/lib/formatters';

import './clientes.css';

export function ClientesPage() {
  const [busca, setBusca] = useState('');
  const { data, isPending, isError } = useClientes(busca || undefined);

  if (isPending) {
    return (
      <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
        <Spinner label="Carregando clientes..." />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <p style={{ color: 'var(--danger)' }}>Erro ao carregar clientes.</p>
      </div>
    );
  }

  return (
    <div className="page-padded">
      <div className="page-toolbar">
        <h1>Clientes</h1>
        <input
          type="search"
          placeholder="Buscar por nome, CNPJ..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar clientes"
        />
        <span className="page-count">{data?.length ?? 0} clientes</span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome Fantasia</th>
              <th>Contato</th>
              <th>CNPJ</th>
              <th>Telefone</th>
              <th>Email</th>
              <th>Cidade/UF</th>
              <th>Segmento</th>
              <th>Ativo</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.nome_fantasia}</strong>
                  {c.razao_social && c.razao_social !== c.nome_fantasia && (
                    <div className="cell-sub">{c.razao_social}</div>
                  )}
                </td>
                <td>{c.nome_contato ?? '—'}</td>
                <td>{c.cnpj ? formatCNPJ(c.cnpj) : '—'}</td>
                <td>{c.telefone ? formatTelefone(c.telefone) : '—'}</td>
                <td>{c.email ?? '—'}</td>
                <td>
                  {c.cidade ? `${c.cidade}${c.estado ? `/${c.estado}` : ''}` : '—'}
                </td>
                <td>
                  {c.segmento && <span className="kb-card-tag">{c.segmento}</span>}
                </td>
                <td>
                  <span className={`badge ${c.ativo ? 'badge-success' : 'badge-muted'}`}>
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            ))}
            {(!data || data.length === 0) && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
