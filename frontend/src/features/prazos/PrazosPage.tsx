import { Spinner } from '@/components/ui/Spinner';
import { useEntregas } from '@/hooks/queries/useOrcamentos';
import { formatDate } from '@/lib/formatters';

import '@/features/clientes/clientes.css';

const STATUS_BADGE: Record<string, string> = {
  planejada: 'badge-info',
  em_producao: 'badge-warning',
  entregue: 'badge-success',
  atrasada: 'badge-danger',
};

const STATUS_LABEL: Record<string, string> = {
  planejada: 'Planejada',
  em_producao: 'Em produção',
  entregue: 'Entregue',
  atrasada: 'Atrasada',
};

export function PrazosPage() {
  const { data, isPending, isError } = useEntregas();

  if (isPending) {
    return (
      <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
        <Spinner label="Carregando entregas..." />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <p style={{ color: 'var(--danger)' }}>Erro ao carregar entregas.</p>
      </div>
    );
  }

  return (
    <div className="page-padded">
      <div className="page-toolbar">
        <h1>Prazo de Entrega</h1>
        <span className="page-count">{data?.length ?? 0} entregas</span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Status</th>
              <th>Prazo Estimado</th>
              <th>Prazo Real</th>
              <th>Observações</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((e) => (
              <tr key={e.id}>
                <td>
                  <code>{e.lead_id.slice(0, 8)}…</code>
                </td>
                <td>
                  <span className={`badge ${STATUS_BADGE[e.status] ?? 'badge-muted'}`}>
                    {STATUS_LABEL[e.status] ?? e.status}
                  </span>
                </td>
                <td>{formatDate(e.prazo_estimado)}</td>
                <td>{formatDate(e.prazo_real)}</td>
                <td style={{ maxWidth: 320 }}>{e.observacoes ?? '—'}</td>
              </tr>
            ))}
            {(!data || data.length === 0) && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                  Nenhuma entrega ainda. Elas são criadas automaticamente quando um lead é marcado como GANHO.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
