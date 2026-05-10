import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLeads } from '@/hooks/queries/useLeads';
import { useStages } from '@/hooks/queries/useStages';
import { useRepresentantes } from '@/hooks/queries/useRepresentantes';
import { Spinner } from '@/components/ui/Spinner';
import { formatBRL } from '@/lib/formatters';

import '@/features/clientes/clientes.css';

// ── Helpers ──────────────────────────────────────────────────────────

function diasAberto(data_abertura: string): number {
  return Math.floor((Date.now() - new Date(data_abertura).getTime()) / 86_400_000);
}

function diasBadge(dias: number): string {
  if (dias > 90) return 'badge-danger';
  if (dias > 30) return 'badge-warning';
  return 'badge-success';
}

function prioridadeBadge(prioridade: string): string {
  if (prioridade === 'alta') return 'badge-danger';
  if (prioridade === 'media' || prioridade === 'média') return 'badge-warning';
  return 'badge-success';
}

function prioridadeLabel(prioridade: string): string {
  if (prioridade === 'alta') return '🔴 Alta';
  if (prioridade === 'media' || prioridade === 'média') return '🟡 Média';
  return '🟢 Baixa';
}

function stageLabel(label: string): string {
  const words = label.trim().split(/\s+/);
  return words.slice(0, 2).join(' ');
}

// ── Componente principal ─────────────────────────────────────────────

export function OrcamentosPage() {
  const navigate = useNavigate();

  const { data: leads, isPending, isError } = useLeads({ status: 'em_aberto' });
  const { data: stages } = useStages();
  const { data: reps } = useRepresentantes();

  const [busca, setBusca] = useState('');
  const [filtroStage, setFiltroStage] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState('');

  // Mapas auxiliares
  const stagesById = useMemo(
    () => new Map((stages ?? []).map((s) => [s.id, s])),
    [stages],
  );

  const repsById = useMemo(
    () => new Map((reps ?? []).map((r) => [r.id, r])),
    [reps],
  );

  // Filtragem local
  const filtered = useMemo(() => {
    let list = leads ?? [];

    if (filtroStage) {
      list = list.filter((l) => l.stage_id === filtroStage);
    }

    if (filtroPrioridade) {
      list = list.filter((l) => l.prioridade === filtroPrioridade);
    }

    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      list = list.filter((l) => {
        const rep = repsById.get(l.representante_id ?? '');
        return (
          (l.codigo_legado ?? '').toLowerCase().includes(q) ||
          l.codigo.toLowerCase().includes(q) ||
          (l.projeto ?? '').toLowerCase().includes(q) ||
          (rep?.nome ?? '').toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [leads, filtroStage, filtroPrioridade, busca, repsById]);

  // Stats
  const totalValor = filtered.reduce((acc, l) => acc + Number(l.valor), 0);
  const totalAltaPrioridade = filtered.filter((l) => l.prioridade === 'alta').length;
  const totalAcima90 = filtered.filter((l) => diasAberto(l.data_abertura) > 90).length;

  // Loading / Error
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

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="page-padded">

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <MiniStat label="Total de orçamentos" value={String(filtered.length)} color="var(--primary)" />
        <MiniStat label="Valor total em aberto" value={formatBRL(totalValor)} color="var(--info)" />
        <MiniStat label="Alta prioridade" value={String(totalAltaPrioridade)} color="var(--danger)" />
        <MiniStat label="Acima de 90 dias" value={String(totalAcima90)} color="var(--warning)" />
      </div>

      {/* Toolbar */}
      <div className="page-toolbar">
        <h1>Orçamentos</h1>

        <input
          id="orc-search"
          type="search"
          placeholder="Buscar por cliente, nº..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar orçamentos"
        />

        <select
          value={filtroStage}
          onChange={(e) => setFiltroStage(e.target.value)}
          aria-label="Filtrar por etapa"
        >
          <option value="">Todas as etapas</option>
          {(stages ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.icone ? `${s.icone} ` : ''}{s.label}
            </option>
          ))}
        </select>

        <select
          value={filtroPrioridade}
          onChange={(e) => setFiltroPrioridade(e.target.value)}
          aria-label="Filtrar por prioridade"
        >
          <option value="">Todas prioridades</option>
          <option value="alta">🔴 Alta</option>
          <option value="media">🟡 Média</option>
          <option value="baixa">🟢 Baixa</option>
        </select>

        <button className="btn-accent">Novo Orçamento</button>
      </div>

      {/* Tabela */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Cliente</th>
              <th>Projeto</th>
              <th>Etapa do Funil</th>
              <th style={{ textAlign: 'right' }}>Valor</th>
              <th>Canal</th>
              <th>Vendedor</th>
              <th>Dias</th>
              <th>Prioridade</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => {
              const stage = stagesById.get(lead.stage_id);
              const rep = repsById.get(lead.representante_id ?? '');
              const dias = diasAberto(lead.data_abertura);
              const nomeVendedor = rep ? rep.nome.split(' ')[0] : '—';
              const canal = rep
                ? rep.canal === 'representante' ? 'Representante' : 'Canal Próprio'
                : '—';
              const canalBadge = rep?.canal === 'representante' ? 'badge-purple' : 'badge-primary';
              const codigo = lead.codigo_legado ?? lead.codigo;

              return (
                <tr
                  key={lead.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/kanban/leads/${lead.id}`)}
                >
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-2)' }}>
                      #{codigo}
                    </span>
                  </td>
                  <td>
                    {/* cliente_id só; nome_fantasia vem do cliente — exibimos o código do lead como fallback */}
                    <strong>{lead.projeto ?? codigo}</strong>
                  </td>
                  <td>
                    <span className="cell-sub">{lead.projeto ?? '—'}</span>
                  </td>
                  <td>
                    {stage ? (
                      <span className="badge badge-info">
                        {stage.icone ? `${stage.icone} ` : ''}{stageLabel(stage.label)}
                      </span>
                    ) : (
                      <span className="badge badge-muted">—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <strong style={{ color: 'var(--primary)' }}>{formatBRL(lead.valor)}</strong>
                  </td>
                  <td>
                    {rep ? (
                      <span className={`badge ${canalBadge}`}>{canal}</span>
                    ) : (
                      <span className="badge badge-muted">—</span>
                    )}
                  </td>
                  <td>{nomeVendedor}</td>
                  <td>
                    <span className={`badge ${diasBadge(dias)}`}>{dias}d</span>
                  </td>
                  <td>
                    <span className={`badge ${prioridadeBadge(lead.prioridade)}`}>
                      {prioridadeLabel(lead.prioridade)}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn-ghost"
                        style={{ padding: '4px 10px', fontSize: '0.85rem' }}
                        title="Avançar etapa"
                        onClick={() => navigate(`/kanban/leads/${lead.id}`)}
                      >
                        →
                      </button>
                      <button
                        className="btn-ghost"
                        style={{ padding: '4px 10px', fontSize: '0.85rem' }}
                        title="Editar"
                        onClick={() => navigate(`/kanban/leads/${lead.id}`)}
                      >
                        ✎
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                  Nenhum orçamento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Sub-componente ────────────────────────────────────────────────────

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <article
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderTop: `3px solid ${color}`,
        borderRadius: 'var(--radius-lg)',
        padding: '12px 18px',
        minWidth: 160,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          fontSize: '0.68rem',
          color: 'var(--text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-1)' }}>{value}</div>
    </article>
  );
}
