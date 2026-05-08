import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Spinner } from '@/components/ui/Spinner';
import { useDashboardKpis } from '@/hooks/queries/useKpis';
import { formatBRL, formatNumber, formatPercent } from '@/lib/formatters';

import './dashboard.css';

export function DashboardPage() {
  const { data, isPending, isError } = useDashboardKpis();

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

  const metaPct = data.meta_anual > 0 ? (data.total_fechado / data.meta_anual) * 100 : 0;

  return (
    <div className="dashboard">
      {/* KPIs principais */}
      <section className="kpi-grid">
        <KpiCard
          label="Meta Anual"
          value={formatBRL(data.meta_anual)}
          color="var(--primary)"
          subtitle={`${formatPercent(metaPct, 1)} atingido`}
        />
        <KpiCard
          label="Total Orçado"
          value={formatBRL(data.total_orcado)}
          color="var(--info)"
          subtitle={`${data.qtd_leads_abertos + data.qtd_leads_ganhos + data.qtd_leads_perdidos} leads`}
        />
        <KpiCard
          label="Total Fechado"
          value={formatBRL(data.total_fechado)}
          color="var(--success)"
          subtitle={`${data.qtd_leads_ganhos} ganhos`}
        />
        <KpiCard
          label="Pipeline Ponderado"
          value={formatBRL(data.valor_pipeline_ponderado)}
          color="var(--accent)"
          subtitle="Σ valor × prob. estágio"
        />
        <KpiCard
          label="Taxa de Conversão"
          value={formatPercent(data.taxa_conversao, 1)}
          color="var(--purple)"
          subtitle={`${data.qtd_leads_ganhos}/${data.qtd_leads_ganhos + data.qtd_leads_perdidos} decididos`}
        />
        <KpiCard
          label="Ticket Médio"
          value={formatBRL(data.ticket_medio)}
          color="var(--warning)"
          subtitle="por venda fechada"
        />
      </section>

      {/* Gráficos */}
      <section className="charts-grid">
        <div className="chart-card">
          <h3>Funil de Vendas</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.funil} margin={{ left: 8, right: 16, top: 8, bottom: 32 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                interval={0}
                angle={-25}
                textAnchor="end"
                height={70}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickFormatter={(v: number) => formatNumber(v / 1000) + 'k'}
                tick={{ fontSize: 11 }}
              />
              <Tooltip formatter={(value: number) => formatBRL(value)} />
              <Bar dataKey="valor_total" name="Valor">
                {data.funil.map((s) => (
                  <Cell key={s.stage_id} fill={s.cor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Evolução Mensal</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.mensal} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(v: number) => formatNumber(v / 1000) + 'k'}
                tick={{ fontSize: 11 }}
              />
              <Tooltip formatter={(value: number) => formatBRL(value)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="valor_orc"
                name="Orçado"
                stroke="var(--info)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="valor_fech"
                name="Fechado"
                stroke="var(--success)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Top representantes */}
      <section className="chart-card">
        <h3>Ranking de Representantes</h3>
        <table className="kpi-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th>Representante</th>
              <th style={{ textAlign: 'right' }}>Leads</th>
              <th style={{ textAlign: 'right' }}>Valor Total</th>
            </tr>
          </thead>
          <tbody>
            {data.top_reps.map((r, idx) => (
              <tr key={r.representante_id}>
                <td style={{ fontSize: '1.05rem', textAlign: 'center' }}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}
                </td>
                <td style={{ fontWeight: idx < 3 ? 700 : 400 }}>{r.nome}</td>
                <td style={{ textAlign: 'right' }}>{r.qtd_leads}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatBRL(r.valor_total)}</td>
              </tr>
            ))}
            {data.top_reps.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: 'var(--text-3)', textAlign: 'center', padding: 20 }}>
                  Nenhum representante com leads
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  color,
  subtitle,
}: {
  label: string;
  value: string;
  color: string;
  subtitle?: string;
}) {
  return (
    <article className="kpi-card-v2" style={{ borderTopColor: color }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {subtitle && <div className="kpi-sub">{subtitle}</div>}
    </article>
  );
}
