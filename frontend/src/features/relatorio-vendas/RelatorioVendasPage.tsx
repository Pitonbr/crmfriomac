import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useRepresentantes } from '@/hooks/queries/useRepresentantes';
import { Spinner } from '@/components/ui/Spinner';
import { http } from '@/lib/http';
import { formatBRL, formatDate, formatPercent } from '@/lib/formatters';

import '@/features/clientes/clientes.css';

// ── Tipos ────────────────────────────────────────────────────────────

type RelatorioVendasItem = {
  lead_id: string;
  codigo: string;
  data_fechamento: string | null;
  cliente: string;
  cidade: string | null;
  estado: string | null;
  vendedor: string;
  valor_total: number;
  valor_entrada: number | null;
  percentual_entrada: number | null;
  forma_pagamento: string | null;
};

type RelatorioVendasOut = {
  items: RelatorioVendasItem[];
  total_valor: number;
  total_entrada: number;
  qtd_vendas: number;
};

// ── API ───────────────────────────────────────────────────────────────

async function fetchRelatorio(params: {
  ano?: number;
  mes?: number;
  representante_id?: string;
}): Promise<RelatorioVendasOut> {
  const qs = new URLSearchParams();
  if (params.ano) qs.set('ano', String(params.ano));
  if (params.mes) qs.set('mes', String(params.mes));
  if (params.representante_id) qs.set('representante_id', params.representante_id);
  return http<RelatorioVendasOut>(`/api/v1/relatorio-vendas?${qs}`);
}

// ── Export CSV ────────────────────────────────────────────────────────

function exportCSV(items: RelatorioVendasItem[]) {
  const headers = [
    'Data Fechamento',
    'Vendedor',
    'Cliente',
    'Cidade',
    'UF',
    'Valor Total',
    'Valor Entrada',
    '% Entrada',
    'Forma Pagamento',
  ];

  const escape = (val: string | number | null | undefined): string => {
    if (val == null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = items.map((item) => [
    escape(item.data_fechamento),
    escape(item.vendedor),
    escape(item.cliente),
    escape(item.cidade),
    escape(item.estado),
    escape(item.valor_total),
    escape(item.valor_entrada),
    item.percentual_entrada != null ? escape(item.percentual_entrada.toFixed(2)) : '',
    escape(item.forma_pagamento),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio-vendas-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Componente principal ─────────────────────────────────────────────

const MESES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export function RelatorioVendasPage() {
  const anoAtual = new Date().getFullYear();

  const [ano, setAno] = useState<number>(anoAtual);
  const [mes, setMes] = useState<number>(0); // 0 = todos
  const [representanteId, setRepresentanteId] = useState<string>('');

  const { data: reps } = useRepresentantes();

  const queryParams = useMemo(
    () => ({
      ano,
      mes: mes > 0 ? mes : undefined,
      representante_id: representanteId || undefined,
    }),
    [ano, mes, representanteId],
  );

  const { data, isPending, isError } = useQuery({
    queryKey: ['relatorio-vendas', queryParams],
    queryFn: () => fetchRelatorio(queryParams),
    staleTime: 60_000,
  });

  const items = data?.items ?? [];

  // Percentual médio de entrada (dos itens com valor)
  const pctMedio = useMemo(() => {
    const comEntrada = items.filter(
      (i) => i.percentual_entrada != null && i.percentual_entrada > 0,
    );
    if (comEntrada.length === 0) return 0;
    const soma = comEntrada.reduce((acc, i) => acc + (i.percentual_entrada ?? 0), 0);
    return soma / comEntrada.length;
  }, [items]);

  // ── Totais da tabela (linha rodapé) ────────────────────────────
  const totalValor = data?.total_valor ?? items.reduce((a, i) => a + i.valor_total, 0);
  const totalEntrada = data?.total_entrada ?? items.reduce((a, i) => a + (i.valor_entrada ?? 0), 0);

  // ── Loading / Error ─────────────────────────────────────────────

  if (isPending) {
    return (
      <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
        <Spinner label="Carregando relatório..." />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <p style={{ color: 'var(--danger)' }}>Erro ao carregar relatório de vendas.</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="page-padded">
      {/* Toolbar */}
      <div className="page-toolbar">
        <h1>Relatório de Vendas</h1>

        <input
          type="number"
          min={2000}
          max={2099}
          value={ano}
          onChange={(e) => setAno(Number(e.target.value))}
          aria-label="Ano"
          style={{
            height: 36,
            padding: '0 10px',
            border: 'var(--border-w) solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--surface)',
            color: 'var(--text-1)',
            fontSize: '0.875rem',
            width: 90,
          }}
        />

        <select
          value={mes}
          onChange={(e) => setMes(Number(e.target.value))}
          aria-label="Mês"
        >
          <option value={0}>Todos os meses</option>
          {MESES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <select
          value={representanteId}
          onChange={(e) => setRepresentanteId(e.target.value)}
          aria-label="Representante"
        >
          <option value="">Todos os representantes</option>
          {(reps ?? []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome}
            </option>
          ))}
        </select>

        <button
          onClick={() => exportCSV(items)}
          disabled={items.length === 0}
          style={{
            height: 36,
            padding: '0 16px',
            borderRadius: 'var(--radius)',
            border: 'var(--border-w) solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-1)',
            cursor: items.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            marginLeft: 'auto',
          }}
        >
          Exportar CSV
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KpiCard
          label="Total de Vendas"
          value={formatBRL(totalValor)}
          color="var(--success)"
        />
        <KpiCard
          label="Qtd. Vendas"
          value={String(data?.qtd_vendas ?? items.length)}
          color="var(--primary)"
        />
        <KpiCard
          label="Total de Entradas"
          value={formatBRL(totalEntrada)}
          color="var(--info)"
        />
        <KpiCard
          label="% Médio de Entrada"
          value={formatPercent(pctMedio, 1)}
          color="var(--warning)"
        />
      </div>

      {/* Tabela */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data Fechamento</th>
              <th>Vendedor</th>
              <th>Cliente</th>
              <th>Cidade/UF</th>
              <th style={{ textAlign: 'right' }}>Valor Total</th>
              <th style={{ textAlign: 'right' }}>Valor Entrada</th>
              <th style={{ textAlign: 'right' }}>% Entrada</th>
              <th>Forma Pagamento</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.lead_id}>
                <td>{formatDate(item.data_fechamento)}</td>
                <td>{item.vendedor}</td>
                <td>
                  <strong>{item.cliente}</strong>
                  {item.codigo && (
                    <div className="cell-sub">{item.codigo}</div>
                  )}
                </td>
                <td>
                  {item.cidade
                    ? `${item.cidade}${item.estado ? `/${item.estado}` : ''}`
                    : '—'}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatBRL(item.valor_total)}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {item.valor_entrada != null ? formatBRL(item.valor_entrada) : '—'}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {item.percentual_entrada != null
                    ? formatPercent(item.percentual_entrada, 1)
                    : '—'}
                </td>
                <td>{item.forma_pagamento ?? '—'}</td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}
                >
                  Nenhuma venda encontrada para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>

          {/* Rodapé de totais */}
          {items.length > 0 && (
            <tfoot>
              <tr
                style={{
                  background: 'var(--surface-2)',
                  borderTop: '2px solid var(--border)',
                }}
              >
                <td
                  colSpan={4}
                  style={{ padding: '10px 14px', fontWeight: 700, fontSize: '0.8rem' }}
                >
                  TOTAIS ({data?.qtd_vendas ?? items.length} vendas)
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    padding: '10px 14px',
                    fontWeight: 700,
                    color: 'var(--success)',
                  }}
                >
                  {formatBRL(totalValor)}
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    padding: '10px 14px',
                    fontWeight: 700,
                    color: 'var(--info)',
                  }}
                >
                  {formatBRL(totalEntrada)}
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    padding: '10px 14px',
                    fontWeight: 700,
                  }}
                >
                  {formatPercent(pctMedio, 1)}
                </td>
                <td style={{ padding: '10px 14px' }} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <article
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderTop: `3px solid ${color}`,
        borderRadius: 'var(--radius-lg)',
        padding: '14px 20px',
        minWidth: 180,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          fontSize: '0.72rem',
          color: 'var(--text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-1)' }}>{value}</div>
    </article>
  );
}
