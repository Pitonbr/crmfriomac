import { Spinner } from '@/components/ui/Spinner';
import { useComissoes } from '@/hooks/queries/useOrcamentos';
import { useRepresentantes } from '@/hooks/queries/useRepresentantes';
import { formatBRL, formatDate, formatNumber } from '@/lib/formatters';

import '@/features/clientes/clientes.css';

const STATUS_BADGE: Record<string, string> = {
  pendente: 'badge-warning',
  aprovada: 'badge-info',
  paga: 'badge-success',
  cancelada: 'badge-muted',
};

export function ComissoesPage() {
  const { data, isPending, isError } = useComissoes();
  const { data: reps } = useRepresentantes();

  const repsById = new Map((reps ?? []).map((r) => [r.id, r]));

  if (isPending) {
    return (
      <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
        <Spinner label="Carregando comissões..." />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <p style={{ color: 'var(--danger)' }}>Erro ao carregar comissões.</p>
      </div>
    );
  }

  const totalPendente = (data ?? [])
    .filter((c) => c.status === 'pendente')
    .reduce((a, c) => a + Number(c.valor_comissao), 0);
  const totalPaga = (data ?? [])
    .filter((c) => c.status === 'paga')
    .reduce((a, c) => a + Number(c.valor_comissao), 0);

  return (
    <div className="page-padded">
      <div className="page-toolbar">
        <h1>Comissões</h1>
        <span className="page-count">
          {data?.length ?? 0} · pendente {formatBRL(totalPendente)} · paga {formatBRL(totalPaga)}
        </span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Representante</th>
              <th style={{ textAlign: 'right' }}>Valor base</th>
              <th style={{ textAlign: 'right' }}>%</th>
              <th style={{ textAlign: 'right' }}>Comissão</th>
              <th>Status</th>
              <th>Data Pagto</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((c) => (
              <tr key={c.id}>
                <td>{repsById.get(c.representante_id)?.nome ?? '—'}</td>
                <td style={{ textAlign: 'right' }}>{formatBRL(c.valor_base)}</td>
                <td style={{ textAlign: 'right' }}>{formatNumber(c.percentual, 2)}%</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                  {formatBRL(c.valor_comissao)}
                </td>
                <td>
                  <span className={`badge ${STATUS_BADGE[c.status] ?? 'badge-muted'}`}>
                    {c.status}
                  </span>
                </td>
                <td>{formatDate(c.data_pagamento)}</td>
              </tr>
            ))}
            {(!data || data.length === 0) && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                  Nenhuma comissão ainda. Elas são criadas automaticamente quando um lead com representante é marcado como GANHO.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
