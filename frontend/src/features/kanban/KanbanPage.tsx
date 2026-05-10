import { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';

import type { Cliente, Representante } from '@/api/schemas';
import { Spinner } from '@/components/ui/Spinner';
import { useClientes } from '@/hooks/queries/useClientes';
import { useLeads } from '@/hooks/queries/useLeads';
import { useRepresentantes } from '@/hooks/queries/useRepresentantes';
import { useStages } from '@/hooks/queries/useStages';
import { useLeadsRealtime } from '@/hooks/useLeadsRealtime';
import { formatBRL } from '@/lib/formatters';

import { KanbanBoard } from './KanbanBoard';
import { NewLeadModal } from './NewLeadModal';
import './styles.css';

const PERIODO_OPTS = [
  { label: '7 dias', value: '7d', days: 7 },
  { label: '30 dias', value: '30d', days: 30 },
  { label: '90 dias', value: '90d', days: 90 },
  { label: 'Este ano', value: 'ano', days: 365 },
] as const;

type PeriodoValue = (typeof PERIODO_OPTS)[number]['value'];

export function KanbanPage() {
  useLeadsRealtime();

  const [busca, setBusca] = useState('');
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [prioFilter, setPrioFilter] = useState<string | null>(null);
  const [resultadoFilter, setResultadoFilter] = useState<string | null>(null);
  const [periodoFilter, setPeriodoFilter] = useState<PeriodoValue | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showNovoLead, setShowNovoLead] = useState(false);

  const stages = useStages();
  const leads = useLeads();
  const clientes = useClientes();
  const reps = useRepresentantes();

  const clientesById = useMemo(() => {
    const m = new Map<string, Cliente>();
    (clientes.data ?? []).forEach((c) => m.set(c.id, c));
    return m;
  }, [clientes.data]);

  const repsById = useMemo(() => {
    const m = new Map<string, Representante>();
    (reps.data ?? []).forEach((r) => m.set(r.id, r));
    return m;
  }, [reps.data]);

  // Stats from all non-deleted leads
  const stats = useMemo(() => {
    const all = leads.data ?? [];
    const ativos = all.filter((l) => l.status === 'em_aberto');
    const ganhos = all.filter((l) => l.status === 'ganho');
    const perdidos = all.filter((l) => l.status === 'perdido');
    return {
      ativos: ativos.length,
      pipeline: ativos.reduce((s, l) => s + l.valor, 0),
      ganhos: ganhos.length,
      perdidos: perdidos.length,
    };
  }, [leads.data]);

  const activeFiltersCount = [stageFilter, prioFilter, resultadoFilter, periodoFilter].filter(
    Boolean,
  ).length;

  const filteredLeads = useMemo(() => {
    let list = leads.data ?? [];

    // Text search
    if (busca.trim()) {
      const q = busca.toLowerCase();
      list = list.filter((l) => {
        const cli = clientesById.get(l.cliente_id);
        return (
          l.codigo.toLowerCase().includes(q) ||
          (l.projeto?.toLowerCase().includes(q) ?? false) ||
          (cli?.nome_fantasia.toLowerCase().includes(q) ?? false)
        );
      });
    }

    // Stage filter (only applies to em_aberto leads)
    if (stageFilter) {
      list = list.filter((l) => l.stage_id === stageFilter || l.status !== 'em_aberto');
    }

    // Priority filter
    if (prioFilter) {
      list = list.filter((l) => l.prioridade === prioFilter);
    }

    // Resultado filter
    if (resultadoFilter) {
      list = list.filter((l) => l.status === resultadoFilter);
    }

    // Period filter
    if (periodoFilter) {
      const opt = PERIODO_OPTS.find((o) => o.value === periodoFilter);
      if (opt) {
        const cutoff = new Date(Date.now() - opt.days * 86_400_000);
        list = list.filter((l) => new Date(l.data_abertura) >= cutoff);
      }
    }

    return list;
  }, [busca, stageFilter, prioFilter, resultadoFilter, periodoFilter, leads.data, clientesById]);

  const clearFilters = () => {
    setStageFilter(null);
    setPrioFilter(null);
    setResultadoFilter(null);
    setPeriodoFilter(null);
    setBusca('');
  };

  if (stages.isPending || leads.isPending) {
    return (
      <div className="kb-loading">
        <Spinner label="Carregando funil de vendas" />
      </div>
    );
  }

  if (stages.isError || leads.isError) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>
        Erro ao carregar dados. Verifique conexão e tente novamente.
      </div>
    );
  }

  const stagesSorted = (stages.data ?? []).sort((a, b) => a.ordem - b.ordem);

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="kb-toolbar">
        <h1>Gestão de Leads</h1>

        {/* Stats */}
        <div className="kb-stats-bar">
          <span className="kb-stat">
            <strong>{stats.ativos}</strong> ativos
          </span>
          <span className="kb-stat pipeline">
            <strong>{formatBRL(stats.pipeline)}</strong>
          </span>
          <span className="kb-stat ganho">
            <strong>🏆 {stats.ganhos}</strong>
          </span>
          <span className="kb-stat perdido">
            <strong>❌ {stats.perdidos}</strong>
          </span>
        </div>

        <div className="kb-toolbar-spacer" />

        {/* Search */}
        <input
          type="search"
          placeholder="Buscar cliente, código, projeto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Busca de leads"
        />

        {/* Filter toggle */}
        <button
          type="button"
          className={`kb-filter-btn${showFilters ? ' active' : ''}`}
          onClick={() => setShowFilters((v) => !v)}
          aria-label="Filtros"
        >
          ⚙ Filtros
          {activeFiltersCount > 0 && (
            <span className="kb-filter-badge">{activeFiltersCount}</span>
          )}
        </button>

        {/* Novo Lead */}
        <button
          type="button"
          className="kb-novo-lead-btn"
          onClick={() => setShowNovoLead(true)}
        >
          + Novo Lead
        </button>
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div className="kb-filter-panel">
          {/* Etapa */}
          <div className="kb-filter-section">
            <span className="kb-filter-section-label">Etapa</span>
            {stagesSorted.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`kb-chip${stageFilter === s.id ? ' active' : ''}`}
                onClick={() => setStageFilter(stageFilter === s.id ? null : s.id)}
              >
                {s.icone ? `${s.icone} ` : ''}{s.label}
              </button>
            ))}
          </div>

          {/* Prioridade */}
          <div className="kb-filter-section">
            <span className="kb-filter-section-label">Prioridade</span>
            {(['alta', 'media', 'baixa'] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`kb-chip ${p}${prioFilter === p ? ' active' : ''}`}
                onClick={() => setPrioFilter(prioFilter === p ? null : p)}
              >
                {p === 'alta' ? '🔴 Alta' : p === 'media' ? '🟡 Média' : '🔵 Baixa'}
              </button>
            ))}
          </div>

          {/* Resultado */}
          <div className="kb-filter-section">
            <span className="kb-filter-section-label">Resultado</span>
            {[
              { v: 'em_aberto', label: '🔄 Ativos' },
              { v: 'ganho', label: '🏆 Ganhos' },
              { v: 'perdido', label: '❌ Perdidos' },
            ].map(({ v, label }) => (
              <button
                key={v}
                type="button"
                className={`kb-chip ${v}${resultadoFilter === v ? ' active' : ''}`}
                onClick={() => setResultadoFilter(resultadoFilter === v ? null : v)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Período */}
          <div className="kb-filter-section">
            <span className="kb-filter-section-label">Período</span>
            {PERIODO_OPTS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`kb-chip${periodoFilter === o.value ? ' active' : ''}`}
                onClick={() => setPeriodoFilter(periodoFilter === o.value ? null : o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>

          {activeFiltersCount > 0 && (
            <button type="button" className="kb-filter-clear" onClick={clearFilters}>
              ✕ Limpar ({activeFiltersCount})
            </button>
          )}
        </div>
      )}

      {/* ── Board ── */}
      <KanbanBoard
        stages={stagesSorted}
        leads={filteredLeads}
        clientes={clientesById}
        reps={repsById}
      />

      {/* Novo Lead modal */}
      {showNovoLead && (
        <NewLeadModal
          stages={stagesSorted}
          onClose={() => setShowNovoLead(false)}
        />
      )}

      {/* Lead modal route (abre em /kanban/leads/:id) */}
      <Outlet />
    </>
  );
}
