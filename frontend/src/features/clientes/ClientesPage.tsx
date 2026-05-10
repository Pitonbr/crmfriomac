import { useState, useMemo } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useClientes } from '@/hooks/queries/useClientes';
import { useLeads } from '@/hooks/queries/useLeads';
import { formatBRL, formatDate, formatTelefone } from '@/lib/formatters';
import type { Cliente } from '@/api/schemas';

import './clientes.css';

// O backend retorna criado_em mesmo que o schema Zod não o declare formalmente
type ClienteComData = Cliente & { criado_em?: string | null };

type SortKey = 'az' | 'za' | '30d' | '90d' | '12m';

const SORT_LABELS: Record<SortKey, string> = {
  az:  'A→Z',
  za:  'Z→A',
  '30d': '30 dias',
  '90d': '90 dias',
  '12m': '12 meses',
};

const SORT_KEYS: SortKey[] = ['az', 'za', '30d', '90d', '12m'];

function diasAtras(dias: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d;
}

function applySort(list: ClienteComData[], sort: SortKey): ClienteComData[] {
  const sorted = [...list];

  if (sort === 'az') {
    return sorted.sort((a, b) => a.nome_fantasia.localeCompare(b.nome_fantasia, 'pt-BR'));
  }

  if (sort === 'za') {
    return sorted.sort((a, b) => b.nome_fantasia.localeCompare(a.nome_fantasia, 'pt-BR'));
  }

  const limite =
    sort === '30d' ? diasAtras(30) :
    sort === '90d' ? diasAtras(90) :
    diasAtras(365);

  return sorted
    .filter((c) => {
      if (!c.criado_em) return false;
      return new Date(c.criado_em) >= limite;
    })
    .sort((a, b) => {
      const da = a.criado_em ? new Date(a.criado_em).getTime() : 0;
      const db = b.criado_em ? new Date(b.criado_em).getTime() : 0;
      return db - da;
    });
}

// ── Componente principal ─────────────────────────────────────────────

export function ClientesPage() {
  const [busca, setBusca] = useState('');
  const [sort, setSort] = useState<SortKey>('az');

  const { data: clientes, isPending, isError } = useClientes(busca || undefined);
  const { data: leads } = useLeads();

  // Agrupa leads por cliente_id para calcular qtd e total
  const leadsByCliente = useMemo(() => {
    const map = new Map<string, { qtd: number; total: number }>();
    (leads ?? []).forEach((l) => {
      const prev = map.get(l.cliente_id) ?? { qtd: 0, total: 0 };
      map.set(l.cliente_id, { qtd: prev.qtd + 1, total: prev.total + Number(l.valor) });
    });
    return map;
  }, [leads]);

  const sorted = useMemo(
    () => applySort((clientes ?? []) as ClienteComData[], sort),
    [clientes, sort],
  );

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

  // ── Render ──────────────────────────────────────────────────────────

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

        {/* Botões de sort */}
        <div style={{ display: 'flex', gap: 6 }}>
          {SORT_KEYS.map((key) => (
            <button
              key={key}
              className={sort === key ? 'btn-accent' : 'btn-ghost'}
              style={{ padding: '0 14px', height: 36, fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              onClick={() => setSort(key)}
            >
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>

        <span className="badge badge-muted" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
          {sorted.length} clientes
        </span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Empresa / Cliente</th>
              <th>Contato</th>
              <th>Telefone</th>
              <th>Email</th>
              <th>Canal</th>
              <th style={{ textAlign: 'center' }}>Orçamentos</th>
              <th style={{ textAlign: 'right' }}>Total Orçado</th>
              <th>Cadastro</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const stats = leadsByCliente.get(c.id) ?? { qtd: 0, total: 0 };
              const canalUpper = (c.canal ?? '').toUpperCase();
              const isRep = canalUpper.includes('REPRESENTANTE');
              const canalBadge = isRep ? 'badge-purple' : 'badge-primary';

              return (
                <tr key={c.id}>
                  <td>
                    <strong>{c.nome_fantasia}</strong>
                    {c.segmento && (
                      <div className="cell-sub">{c.segmento}</div>
                    )}
                  </td>
                  <td>{c.nome_contato ?? '—'}</td>
                  <td>{c.telefone ? formatTelefone(c.telefone) : '—'}</td>
                  <td>{c.email ?? '—'}</td>
                  <td>
                    {c.canal ? (
                      <span className={`badge ${canalBadge}`}>{c.canal}</span>
                    ) : (
                      <span className="badge badge-muted">—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <strong>{stats.qtd}</strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <strong style={{ color: 'var(--primary)' }}>{formatBRL(stats.total)}</strong>
                  </td>
                  <td>
                    <span className="cell-sub">{formatDate(c.criado_em)}</span>
                  </td>
                  <td>
                    <button
                      className="btn-ghost"
                      style={{ padding: '4px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    >
                      Ver / Editar
                    </button>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
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
