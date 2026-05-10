import { useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

import { Spinner } from '@/components/ui/Spinner';
import { useClientes } from '@/hooks/queries/useClientes';
import { useLeads } from '@/hooks/queries/useLeads';
import { useStages } from '@/hooks/queries/useStages';
import { formatTelefone } from '@/lib/formatters';
import type { Cliente, Lead, Stage } from '@/api/schemas';

import './clientes.css';

// ── Tipos ──────────────────────────────────────────────────────────────
type SortKey = 'az' | 'za' | '30d' | '90d' | '12m';

const SORT_LABELS: Record<SortKey, string> = {
  az: 'A→Z',
  za: 'Z→A',
  '30d': '30 dias',
  '90d': '90 dias',
  '12m': '12 meses',
};

const SORT_KEYS: SortKey[] = ['az', 'za', '30d', '90d', '12m'];

// ── Helpers ────────────────────────────────────────────────────────────
function diasAtras(dias: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d;
}

interface ClienteEnriquecido extends Cliente {
  _qtdLeads: number;
  _totalPipeline: number;
  _stage: Stage | null;
  _ultimaAtividade: Date | null;
}

function enriquecer(
  clientes: Cliente[],
  leads: Lead[],
  stagesMap: Map<string, Stage>,
): ClienteEnriquecido[] {
  // Agrupar leads por cliente
  const byCliente = new Map<string, Lead[]>();
  leads.forEach((l) => {
    const arr = byCliente.get(l.cliente_id) ?? [];
    arr.push(l);
    byCliente.set(l.cliente_id, arr);
  });

  return clientes.map((c) => {
    const cLeads = byCliente.get(c.id) ?? [];
    const ativos = cLeads.filter((l) => l.status === 'em_aberto');
    const totalPipeline = ativos.reduce((s, l) => s + l.valor, 0);

    // Stage do lead ativo mais recente
    const leadMaisRecente = ativos.sort(
      (a, b) =>
        new Date(b.data_ultima_movimentacao).getTime() -
        new Date(a.data_ultima_movimentacao).getTime(),
    )[0];

    const stage = leadMaisRecente ? (stagesMap.get(leadMaisRecente.stage_id) ?? null) : null;

    // Última data de atividade (qualquer lead)
    const ultimaAtividade =
      cLeads.length > 0
        ? new Date(
            Math.max(
              ...cLeads.map((l) => new Date(l.data_ultima_movimentacao).getTime()),
            ),
          )
        : null;

    return {
      ...c,
      _qtdLeads: cLeads.length,
      _totalPipeline: totalPipeline,
      _stage: stage,
      _ultimaAtividade: ultimaAtividade,
    };
  });
}

function aplicarFiltro(list: ClienteEnriquecido[], sort: SortKey): ClienteEnriquecido[] {
  if (sort === 'az') {
    return [...list].sort((a, b) =>
      a.nome_fantasia.localeCompare(b.nome_fantasia, 'pt-BR'),
    );
  }
  if (sort === 'za') {
    return [...list].sort((a, b) =>
      b.nome_fantasia.localeCompare(a.nome_fantasia, 'pt-BR'),
    );
  }

  // Filtros temporais: usar última atividade de leads
  const dias =
    sort === '30d' ? 30 : sort === '90d' ? 90 : 365;
  const limite = diasAtras(dias);

  return [...list]
    .filter((c) => c._ultimaAtividade !== null && c._ultimaAtividade >= limite)
    .sort((a, b) => {
      const ta = a._ultimaAtividade?.getTime() ?? 0;
      const tb = b._ultimaAtividade?.getTime() ?? 0;
      return tb - ta;
    });
}

// ── Exportação ─────────────────────────────────────────────────────────
function exportCSV(list: ClienteEnriquecido[], stageName: (c: ClienteEnriquecido) => string) {
  const header = ['Empresa', 'Nome Contato', 'Telefone', 'Email', 'Etapa do Funil', 'Leads Ativos', 'Pipeline Total'];
  const rows = list.map((c) => [
    c.nome_fantasia,
    c.nome_contato ?? '',
    c.telefone ?? '',
    c.email ?? '',
    stageName(c),
    String(c._qtdLeads),
    String(c._totalPipeline.toFixed(2)),
  ]);

  const csv =
    [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

  const bom = '﻿'; // BOM para Excel reconhecer UTF-8
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPrint(list: ClienteEnriquecido[], stageName: (c: ClienteEnriquecido) => string, filtro: string) {
  const linhas = list
    .map(
      (c) => `
      <tr>
        <td>${c.nome_fantasia}</td>
        <td>${c.nome_contato ?? '—'}</td>
        <td>${c.telefone ?? '—'}</td>
        <td>${c.email ?? '—'}</td>
        <td>${stageName(c)}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>Clientes Friomac — ${filtro}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; }
  h2 { margin-bottom: 8px; }
  p { color: #666; margin-bottom: 12px; }
  table { border-collapse: collapse; width: 100%; }
  th { background: #f4f4f4; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; border: 1px solid #ddd; }
  td { padding: 5px 8px; border: 1px solid #eee; }
  tr:nth-child(even) { background: #fafafa; }
  @media print { @page { margin: 1cm; } }
</style>
</head>
<body>
<h2>Clientes Friomac</h2>
<p>Filtro: ${filtro} — ${list.length} registros — ${new Date().toLocaleDateString('pt-BR')}</p>
<table>
  <thead>
    <tr><th>Empresa</th><th>Contato</th><th>Telefone</th><th>E-mail</th><th>Etapa do Funil</th></tr>
  </thead>
  <tbody>${linhas}</tbody>
</table>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 300);
}

// ── Componente principal ────────────────────────────────────────────────
export function ClientesPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [sort, setSort] = useState<SortKey>('az');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const { data: clientes, isPending, isError } = useClientes(busca || undefined);
  const { data: leads } = useLeads();
  const { data: stages } = useStages();

  const stagesMap = useMemo(
    () => new Map((stages ?? []).map((s) => [s.id, s])),
    [stages],
  );

  const enriched = useMemo(
    () => enriquecer(clientes ?? [], leads ?? [], stagesMap),
    [clientes, leads, stagesMap],
  );

  const filtered = useMemo(
    () => aplicarFiltro(enriched, sort),
    [enriched, sort],
  );

  const stageName = (c: ClienteEnriquecido) => c._stage?.label ?? '—';

  if (isPending) {
    return (
      <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
        <Spinner label="Carregando clientes..." />
      </div>
    );
  }
  if (isError) {
    return (
      <div style={{ padding: 40, color: 'var(--danger)' }}>
        Erro ao carregar clientes.
      </div>
    );
  }

  return (
    <div className="page-padded">
      {/* ── Toolbar ── */}
      <div className="page-toolbar">
        <h1>Clientes</h1>

        <input
          type="search"
          placeholder="Buscar por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar clientes"
        />

        {/* Filtros */}
        <div className="cli-filter-group">
          {SORT_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={`cli-filter-btn${sort === key ? ' active' : ''}`}
              onClick={() => setSort(key)}
              title={
                ['30d', '90d', '12m'].includes(key)
                  ? `Clientes com atividade nos últimos ${SORT_LABELS[key]}`
                  : `Ordenar ${SORT_LABELS[key]}`
              }
            >
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Contador + Export */}
        <div className="cli-count-row">
          <span className="cli-count">{filtered.length} clientes</span>

          <div className="cli-export-wrap" ref={exportRef}>
            <button
              type="button"
              className="cli-export-btn"
              onClick={() => setShowExportMenu((v) => !v)}
              aria-label="Exportar lista"
            >
              ↑ Exportar
            </button>
            {showExportMenu && (
              <div className="cli-export-menu" onMouseLeave={() => setShowExportMenu(false)}>
                <button
                  type="button"
                  className="cli-export-option"
                  onClick={() => {
                    exportCSV(filtered, stageName);
                    setShowExportMenu(false);
                  }}
                >
                  📊 Exportar para Excel (CSV)
                </button>
                <button
                  type="button"
                  className="cli-export-option"
                  onClick={() => {
                    exportPrint(filtered, stageName, SORT_LABELS[sort]);
                    setShowExportMenu(false);
                  }}
                >
                  📄 Exportar para PDF
                </button>
                <button
                  type="button"
                  className="cli-export-option"
                  onClick={() => {
                    exportPrint(filtered, stageName, SORT_LABELS[sort]);
                    setShowExportMenu(false);
                  }}
                >
                  🖨️ Imprimir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabela ── */}
      <div className="table-wrap">
        <table className="data-table cli-table">
          <thead>
            <tr>
              <th>Empresa / Cliente</th>
              <th>Nome do Contato</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th>Etapa do Funil</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                className="cli-row"
                onClick={() => navigate(`/clientes/${c.id}`)}
                title="Clique para ver detalhes"
              >
                <td>
                  <strong>{c.nome_fantasia}</strong>
                  {c.razao_social && c.razao_social !== c.nome_fantasia && (
                    <div className="cell-sub">{c.razao_social}</div>
                  )}
                  {c.cidade && (
                    <div className="cell-sub">
                      📍 {c.cidade}{c.estado ? `/${c.estado}` : ''}
                    </div>
                  )}
                </td>
                <td>{c.nome_contato || '—'}</td>
                <td>{c.telefone ? formatTelefone(c.telefone) : '—'}</td>
                <td>
                  {c.email ? (
                    <a
                      href={`mailto:${c.email}`}
                      className="cli-email-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.email}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  {c._stage ? (
                    <span
                      className="cli-stage-badge"
                      style={{ borderColor: c._stage.cor, color: c._stage.cor }}
                    >
                      {c._stage.icone ? `${c._stage.icone} ` : ''}{c._stage.label}
                    </span>
                  ) : c._qtdLeads > 0 ? (
                    <span className="cli-stage-badge" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
                      ✓ Concluído
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-3)', fontSize: '.8rem' }}>Sem leads</span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="cli-ver-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/clientes/${c.id}`);
                    }}
                  >
                    Ver detalhes →
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                  Nenhum cliente encontrado
                  {['30d', '90d', '12m'].includes(sort) && (
                    <span> com atividade nos últimos {SORT_LABELS[sort]}</span>
                  )}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de cliente (rota aninhada) */}
      <Outlet />
    </div>
  );
}
