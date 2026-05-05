import { Spinner } from '@/components/ui/Spinner';
import { useRepresentantes } from '@/hooks/queries/useRepresentantes';
import { formatNumber, formatTelefone } from '@/lib/formatters';

import '@/features/clientes/clientes.css';

const CANAL_LABEL: Record<string, string> = {
  canal_proprio: 'Canal Próprio',
  representante: 'Representante',
};

export function VendedoresPage() {
  const { data, isPending, isError } = useRepresentantes();

  if (isPending) {
    return (
      <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
        <Spinner label="Carregando vendedores e representantes..." />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <p style={{ color: 'var(--danger)' }}>Erro ao carregar.</p>
      </div>
    );
  }

  const canalProprio = (data ?? []).filter((r) => r.canal === 'canal_proprio');
  const externos = (data ?? []).filter((r) => r.canal === 'representante');

  return (
    <div className="page-padded">
      <div className="page-toolbar">
        <h1>Vendedores & Representantes</h1>
        <span className="page-count">
          {canalProprio.length} canal próprio · {externos.length} reps externos
        </span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Canal</th>
              <th style={{ textAlign: 'right' }}>Comissão</th>
              <th>Cidade/UF</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.nome}</strong>
                </td>
                <td>
                  <span className={`badge ${r.canal === 'canal_proprio' ? 'badge-info' : 'badge-purple'}`}>
                    {CANAL_LABEL[r.canal] ?? r.canal}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatNumber(r.comissao_pct, 2)}%
                </td>
                <td>
                  {r.cidade ? `${r.cidade}${r.estado ? `/${r.estado}` : ''}` : '—'}
                </td>
                <td>{r.email ?? '—'}</td>
                <td>{r.telefone ? formatTelefone(r.telefone) : '—'}</td>
                <td>
                  <span className={`badge ${r.ativo ? 'badge-success' : 'badge-muted'}`}>
                    {r.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
