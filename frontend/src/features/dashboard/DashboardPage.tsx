import { useNavigate } from 'react-router-dom';

import { Spinner } from '@/components/ui/Spinner';
import { useDashboardKpis } from '@/hooks/queries/useKpis';
import { formatBRL } from '@/lib/formatters';
import type { DashboardKPIs, LeadRecente, TopLead } from '@/api/schemas';

import './dashboard.css';

// ── Ícones SVG idênticos ao legado ───────────────────────────────
const IconMoney = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
);
const IconCheck = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconTarget = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const IconPeople = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconClock = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────
function prioridadeDot(p: string) {
  if (p === 'alta') return 'var(--danger)';
  if (p === 'media') return 'var(--warning)';
  return 'var(--success)';
}

function diasBadge(dias: number) {
  if (dias > 90) return 'badge-danger';
  if (dias > 30) return 'badge-warning';
  return 'badge-success';
}

function formatDateBR(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Componente KPI Card (exato do legado) ────────────────────────
interface KpiCardProps {
  color: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'red';
  icon: React.ReactNode;
  value: string;
  label: string;
  delta: string;
  deltaType: 'up' | 'down' | 'neutral';
}

function KpiCard({ color, icon, value, label, delta, deltaType }: KpiCardProps) {
  return (
    <div className={`kpi-card ${color}`}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      <span className={`kpi-delta ${deltaType}`}>{delta}</span>
    </div>
  );
}

// ── Funil Visual (barras CSS — exato do legado) ──────────────────
function FunnelVisual({ funil }: { funil: DashboardKPIs['funil'] }) {
  const pipelineMax = Math.max(...funil.map(f => f.valor_total), 1);
  return (
    <div className="funnel-visual">
      {funil.map((f) => {
        const pct = Math.round((f.valor_total / pipelineMax) * 100) || 2;
        return (
          <div key={f.stage_id} className="funnel-row">
            <div className="funnel-label">{f.icone} {f.label}</div>
            <div className="funnel-bar-wrap">
              <div
                className="funnel-bar"
                style={{ width: `${pct}%`, background: f.cor }}
              >
                {f.qtd_leads > 0 ? f.qtd_leads : ''}
              </div>
            </div>
            <div className="funnel-count">{f.qtd_leads}</div>
            <div className="funnel-value">{f.valor_total > 0 ? formatBRL(f.valor_total) : '—'}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Evolução Mensal (mini barras CSS — exato do legado) ──────────
function MonthBars({ mensal, totalOrcado }: { mensal: DashboardKPIs['mensal']; totalOrcado: number }) {
  const maxOrc = Math.max(...mensal.map(m => m.valor_orc), 1);
  const mesesAtivos = mensal.filter(m => m.valor_orc > 0).length;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, marginBottom: 8 }}>
        {mensal.map((m) => {
          const h = Math.round((m.valor_orc / maxOrc) * 100) || 0;
          const isActive = m.valor_orc > 0;
          const mesLabel = m.mes.split('-')[1] ?? m.mes;
          const mesNomes = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
          const label = mesNomes[parseInt(mesLabel, 10)] ?? mesLabel;
          return (
            <div
              key={m.mes}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer' }}
              title={`${label}: ${formatBRL(m.valor_orc)}`}
            >
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{
                  width: '100%',
                  height: `${Math.max(h, 3)}%`,
                  background: isActive ? 'var(--primary)' : 'var(--border)',
                  borderRadius: '3px 3px 0 0',
                  transition: 'height .4s ease',
                }} />
              </div>
              <div style={{ fontSize: '.65rem', color: 'var(--text-3)' }}>{label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>{mesesAtivos}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>Meses com atividade</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent)' }}>{formatBRL(totalOrcado)}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>Total em pipeline</div>
        </div>
      </div>
    </>
  );
}

// ── Tabela top leads ─────────────────────────────────────────────
function TopLeadsTable({ leads }: { leads: TopLead[] }) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Valor</th>
            <th>Dias</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {leads.map(l => (
            <tr key={l.id} style={{ cursor: 'pointer' }}>
              <td>
                <div style={{ fontWeight: 600, fontSize: '.82rem', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.nome_fantasia}
                </div>
                <div style={{ fontSize: '.7rem', color: 'var(--text-3)' }}>#{l.codigo}</div>
              </td>
              <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatBRL(l.valor)}</td>
              <td>
                <span className={`badge ${diasBadge(l.dias_aberto)}`}>{l.dias_aberto}d</span>
              </td>
              <td>
                <span className="badge badge-info" style={{ fontSize: '.65rem' }}>
                  {l.stage_icone} {l.stage_label.split(' ')[0]}
                </span>
              </td>
            </tr>
          ))}
          {leads.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--text-3)' }}>
                Nenhum lead em aberto
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Lista de atividade recente ────────────────────────────────────
function ActivityList({ leads }: { leads: LeadRecente[] }) {
  return (
    <div className="card-body" style={{ padding: '8px 16px' }}>
      <div className="activity-list">
        {leads.map(l => (
          <div key={l.id} className="activity-item" style={{ cursor: 'pointer' }}>
            <div className="activity-dot" style={{ background: prioridadeDot(l.prioridade) }} />
            <div className="activity-content">
              <strong>{l.nome_fantasia}</strong>
              <p>{formatBRL(l.valor)} · {l.stage_label}</p>
            </div>
            <div className="activity-time">{formatDateBR(l.data_abertura)}</div>
          </div>
        ))}
        {leads.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: '.85rem' }}>
            Nenhum lead recente
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dashboard principal ───────────────────────────────────────────
export function DashboardPage() {
  const { data, isPending, isError } = useDashboardKpis();
  const navigate = useNavigate();

  if (isPending) {
    return (
      <div className="dashboard-loading">
        <Spinner label="Carregando KPIs..." />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <p style={{ color: 'var(--danger)' }}>Erro ao carregar KPIs.</p>
      </div>
    );
  }

  const metaPercent = data.meta_anual > 0
    ? ((data.total_fechado / data.meta_anual) * 100).toFixed(1)
    : '0.0';
  const metaWidth = Math.min(parseFloat(metaPercent), 100);

  return (
    <div className="dashboard">

      {/* ── KPI CARDS (7 cards idênticos ao legado) ─────────────── */}
      <div className="kpi-grid">
        <KpiCard
          color="blue"
          icon={<IconMoney />}
          value={formatBRL(data.total_orcado)}
          label="Pipeline Total em Aberto"
          delta={`▶ ${data.qtd_leads_abertos} orçamentos`}
          deltaType="neutral"
        />
        <KpiCard
          color="green"
          icon={<IconCheck />}
          value={formatBRL(data.total_fechado)}
          label="Receita Fechada 2026"
          delta={`${data.qtd_leads_ganhos} contratos`}
          deltaType={data.total_fechado > 0 ? 'up' : 'neutral'}
        />
        <KpiCard
          color="orange"
          icon={<IconTarget />}
          value={`${data.taxa_conversao.toFixed(1)}%`}
          label="Taxa de Conversão"
          delta={`Meta: 35%`}
          deltaType="neutral"
        />
        <KpiCard
          color="purple"
          icon={<IconPeople />}
          value={String(data.vendedores_ativos)}
          label="Vendedores Ativos"
          delta="Canal próprio + Reps"
          deltaType="neutral"
        />
        <KpiCard
          color="teal"
          icon={<IconCalendar />}
          value={String(data.leads_alta_prioridade)}
          label="Alta Prioridade Hoje"
          delta="Atenção necessária"
          deltaType={data.leads_alta_prioridade > 5 ? 'down' : 'up'}
        />
        <KpiCard
          color="red"
          icon={<IconClock />}
          value={String(data.leads_mais_90_dias)}
          label="Leads >90 dias em aberto"
          delta="Requer ação urgente"
          deltaType="down"
        />
        <div className="kpi-card" style={{ borderTop: '3px solid var(--danger)' }}>
          <div className="kpi-icon" style={{ color: 'var(--danger)' }}>❌</div>
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>{data.qtd_leads_perdidos}</div>
          <div className="kpi-label">Clientes Perdidos</div>
          <span className="kpi-delta neutral">{formatBRL(data.total_perdido)} perdido</span>
        </div>
      </div>

      {/* ── META ANUAL ──────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-body" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div className="section-title">🎯 Meta Anual 2026</div>
              <div style={{ fontSize: '.78rem', color: 'var(--text-3)', marginTop: 2 }}>
                {formatBRL(data.total_fechado)} de {formatBRL(data.meta_anual)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{metaPercent}%</div>
              <div style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>atingido</div>
            </div>
          </div>
          <div className="progress-wrap" style={{ height: 10 }}>
            <div className="progress-bar progress-orange" style={{ width: `${metaWidth}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '.72rem', color: 'var(--text-3)' }}>
            <span>Jan 2026</span>
            <span>Faltam: {formatBRL(data.meta_anual - data.total_fechado)}</span>
            <span>Dez 2026</span>
          </div>
        </div>
      </div>

      {/* ── GRÁFICOS (2 colunas — CSS puro idêntico ao legado) ───── */}
      <div className="charts-grid">
        {/* Funil de Vendas */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🚀 Funil de Vendas</div>
            <span className="badge badge-primary">{data.qtd_leads_abertos} leads</span>
          </div>
          <div className="card-body" style={{ padding: '16px 18px' }}>
            <FunnelVisual funil={data.funil} />
          </div>
        </div>

        {/* Evolução Mensal */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📅 Evolução Mensal</div>
            <span className="badge badge-info">2026</span>
          </div>
          <div className="card-body" style={{ padding: '16px 18px' }}>
            <MonthBars mensal={data.mensal} totalOrcado={data.total_orcado} />
          </div>
        </div>
      </div>

      {/* ── TABELAS INFERIORES (2 colunas — idêntico ao legado) ──── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Maiores Orçamentos em Aberto */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">💰 Maiores Orçamentos em Aberto</div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/kanban')}
            >
              Ver todos →
            </button>
          </div>
          <TopLeadsTable leads={data.top_leads} />
        </div>

        {/* Últimos Leads Cadastrados */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🔔 Últimos Leads Cadastrados</div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/kanban')}
            >
              Ver todos →
            </button>
          </div>
          <ActivityList leads={data.leads_recentes} />
        </div>
      </div>

    </div>
  );
}
