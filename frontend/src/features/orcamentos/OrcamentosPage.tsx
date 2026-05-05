import { Spinner } from '@/components/ui/Spinner';
import { useOrcamentos } from '@/hooks/queries/useOrcamentos';
import { formatBRL, formatDate } from '@/lib/formatters';

import '@/features/clientes/clientes.css';

const STATUS_BADGE: Record<string, string> = {
  rascunho: 'badge-muted',
  enviado: 'badge-info',
  aceito: 'badge-success',
  recusado: 'badge-danger',
  expirado: 'badge-warning',
};

export function OrcamentosPage() {
  const { data, isPending, isError } = useOrcamentos();

  if (isPending) {
    return (
      <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
        <Spinner label="Carregando orçamentos..." />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <p style={{ color: 'var(--danger)' }}>Erro ao carregar orçamentos.</p>
      </div>
    );
  }

  const total = (data ?? []).reduce((acc, o) => acc + Number(o.valor_total), 0);

  return (
    <div className="page-padded">
      <div className="page-toolbar">
        <h1>Orçamentos</h1>
        <span className="page-count">
          {data?.length ?? 0} orçamentos · total {formatBRL(total)}
        </span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Versão</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Valor</th>
              <th>Data Envio</th>
              <th>Validade</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((o) => (
              <tr key={o.id}>
                <td><strong>{o.numero}</strong></td>
                <td>v{o.versao}</td>
                <td>
                  <span className={`badge ${STATUS_BADGE[o.status] ?? 'badge-muted'}`}>
                    {o.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatBRL(o.valor_total)}</td>
                <td>{formatDate(o.data_envio)}</td>
                <td>{formatDate(o.validade_ate)}</td>
              </tr>
            ))}
            {(!data || data.length === 0) && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                  Nenhum orçamento ainda. Eles serão criados quando você enviar propostas pelos leads.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
