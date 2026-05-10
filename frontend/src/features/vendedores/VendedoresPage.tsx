import { useState, useMemo } from 'react'
import { useRepresentantes } from '@/hooks/queries/useRepresentantes'
import { useLeads } from '@/hooks/queries/useLeads'
import { Spinner } from '@/components/ui/Spinner'
import { formatBRL } from '@/lib/formatters'
import '@/features/clientes/clientes.css'

import { useAuthStore } from '@/store/authStore'

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = 'ativos' | 'canal_proprio' | 'representantes' | 'inativos'

// ── Helper: iniciais ─────────────────────────────────────────────────────────

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

// ── Ranking emoji ────────────────────────────────────────────────────────────

function rankingEmoji(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return ''
}

// ── Component ────────────────────────────────────────────────────────────────

export function VendedoresPage() {
  const [activeTab, setActiveTab] = useState<Tab>('ativos')

  const { data: reps = [], isPending: repsPending, isError: repsError } = useRepresentantes()
  const { data: leads = [], isPending: leadsPending, isError: leadsError } = useLeads()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'master'

  const isPending = repsPending || leadsPending
  const isError = repsError || leadsError

  // ── Enrich reps with lead stats ──────────────────────────────────────────

  const enriched = useMemo(() => {
    return reps.map((rep) => {
      const repLeads = leads.filter((l) => l.representante_id === rep.id)
      const qtdOrc = repLeads.filter((l) => l.status === 'em_aberto').length
      const totalOrc = repLeads.reduce((s, l) => s + Number(l.valor), 0)
      const fechados = repLeads.filter((l) => l.status === 'ganho').length
      const perdidos = repLeads.filter((l) => l.status === 'perdido').length
      const taxa = (fechados + perdidos) > 0 ? (fechados / (fechados + perdidos)) * 100 : 0
      return { ...rep, qtdOrc, totalOrc, fechados, perdidos, taxa }
    })
  }, [reps, leads])

  // ── Rankings by totalOrc (ativos apenas) ────────────────────────────────

  const rankingMap = useMemo(() => {
    const ativos = enriched.filter((r) => r.ativo)
    const sorted = [...ativos].sort((a, b) => b.totalOrc - a.totalOrc)
    const map = new Map<string, number>()
    sorted.forEach((r, i) => map.set(r.id, i + 1))
    return map
  }, [enriched])

  // ── Counts for tabs ──────────────────────────────────────────────────────

  const cntAtivos = enriched.filter((r) => r.ativo).length
  const cntCanalProprio = enriched.filter((r) => r.ativo && r.canal === 'canal_proprio').length
  const cntRepresentantes = enriched.filter((r) => r.ativo && r.canal === 'representante').length
  const cntInativos = enriched.filter((r) => !r.ativo).length

  // ── Filter by tab ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (activeTab === 'ativos') return enriched.filter((r) => r.ativo)
    if (activeTab === 'canal_proprio') return enriched.filter((r) => r.ativo && r.canal === 'canal_proprio')
    if (activeTab === 'representantes') return enriched.filter((r) => r.ativo && r.canal === 'representante')
    if (activeTab === 'inativos') return enriched.filter((r) => !r.ativo)
    return enriched
  }, [enriched, activeTab])

  // ── Summary stats ────────────────────────────────────────────────────────

  const totalOrcadoGeral = useMemo(
    () => enriched.filter((r) => r.ativo).reduce((s, r) => s + r.totalOrc, 0),
    [enriched],
  )

  // ── Loading / Error states ───────────────────────────────────────────────

  if (isPending) {
    return (
      <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
        <Spinner label="Carregando vendedores e representantes..." />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <p style={{ color: 'var(--danger)' }}>Erro ao carregar.</p>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="page-padded">
      {/* ── Stats Row ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <StatMini value={cntAtivos} label="Ativos" />
        <StatMini value={cntCanalProprio} label="Canal Próprio" />
        <StatMini value={cntRepresentantes} label="Representantes" />
        <StatMini value={formatBRL(totalOrcadoGeral)} label="Total Orçado" />
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="page-toolbar" style={{ gap: 8 }}>
        <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
          <TabButton active={activeTab === 'ativos'} onClick={() => setActiveTab('ativos')}>
            Todos Ativos ({cntAtivos})
          </TabButton>
          <TabButton active={activeTab === 'canal_proprio'} onClick={() => setActiveTab('canal_proprio')}>
            Canal Próprio ({cntCanalProprio})
          </TabButton>
          <TabButton active={activeTab === 'representantes'} onClick={() => setActiveTab('representantes')}>
            Representantes ({cntRepresentantes})
          </TabButton>
          <TabButton active={activeTab === 'inativos'} onClick={() => setActiveTab('inativos')}>
            Inativos ({cntInativos})
          </TabButton>
        </div>

        {isAdmin && (
          <button
            className="btn-primary"
            disabled
            style={{ opacity: 0.5, cursor: 'not-allowed' }}
            title="Disponível em breve"
          >
            + Novo Vendedor
          </button>
        )}
      </div>

      {/* ── Rep Cards Grid ────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-3)' }}>Nenhum resultado nesta categoria.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {filtered.map((rep) => {
            const rank = rankingMap.get(rep.id)
            const emoji = rank ? rankingEmoji(rank) : ''
            const inativo = !rep.ativo

            return (
              <div
                key={rep.id}
                style={{
                  background: inativo ? 'var(--surface-2)' : 'var(--surface)',
                  border: inativo
                    ? '1.5px dashed var(--border-2)'
                    : '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 20,
                  opacity: inativo ? 0.55 : 1,
                  boxShadow: inativo ? 'none' : 'var(--shadow-sm)',
                  transition: 'box-shadow .18s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0,
                }}
              >
                {/* ── Card Header ──────────────────────────────────── */}
                <div
                  style={{
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                    marginBottom: 16,
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: inativo
                        ? 'var(--border-2)'
                        : 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-inv)',
                      fontWeight: 800,
                      fontSize: '1rem',
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(rep.nome)}
                  </div>

                  {/* Nome + badge + ranking */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'wrap',
                        marginBottom: 4,
                      }}
                    >
                      <strong
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          color: 'var(--text-1)',
                          lineHeight: 1.3,
                        }}
                      >
                        {rep.nome}
                      </strong>
                      {inativo && (
                        <span
                          style={{
                            background: 'var(--danger-bg)',
                            color: 'var(--danger)',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '1px 7px',
                            borderRadius: 999,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Inativo
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        className={`badge ${rep.canal === 'canal_proprio' ? 'badge-primary' : 'badge-purple'}`}
                        style={
                          rep.canal === 'canal_proprio'
                            ? {
                                background: 'var(--primary)',
                                color: '#fff',
                                padding: '2px 10px',
                                borderRadius: 999,
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }
                            : undefined
                        }
                      >
                        {rep.canal === 'canal_proprio' ? 'Canal Próprio' : 'Representante'}
                      </span>

                      {emoji && (
                        <span style={{ fontSize: '1.1rem' }} title={`${rank}º lugar`}>
                          {emoji}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Stats Grid 2x2 ───────────────────────────────── */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <RepStat label="Orçamentos" value={rep.qtdOrc} />
                  <RepStat label="Fechados" value={rep.fechados} />
                  <RepStat label="Total orçado" value={formatBRL(rep.totalOrc)} />
                  <RepStat
                    label="Conversão"
                    value={rep.taxa > 0 ? `${rep.taxa.toFixed(1)}%` : '—'}
                  />
                </div>

                {/* ── Contato ──────────────────────────────────────── */}
                {(rep.telefone || rep.email) && (
                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-2)',
                      marginBottom: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                    }}
                  >
                    {rep.telefone && (
                      <span>📞 {rep.telefone}</span>
                    )}
                    {rep.email && (
                      <span>✉ {rep.email}</span>
                    )}
                  </div>
                )}

                {/* ── Footer ───────────────────────────────────────── */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border)',
                    marginTop: 'auto',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontWeight: 600 }}>
                      Comissão: {rep.comissao_pct}%
                    </span>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        disabled
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius)',
                          border: '1.5px solid var(--border-2)',
                          background: 'var(--surface)',
                          color: 'var(--text-2)',
                          fontWeight: 600,
                          cursor: 'not-allowed',
                          opacity: 0.6,
                        }}
                        title="Editar (em breve)"
                      >
                        Editar
                      </button>
                      <button
                        disabled
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius)',
                          border: '1.5px solid var(--border-2)',
                          background: 'var(--surface)',
                          color: 'var(--text-2)',
                          fontWeight: 600,
                          cursor: 'not-allowed',
                          opacity: 0.6,
                        }}
                        title="Ver leads"
                      >
                        Leads
                      </button>
                    </div>
                  </div>

                  {isAdmin && rep.ativo && (
                    <button
                      disabled
                      style={{
                        fontSize: '0.72rem',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius)',
                        border: '1.5px solid var(--danger)',
                        background: 'var(--danger-bg)',
                        color: 'var(--danger)',
                        fontWeight: 600,
                        cursor: 'not-allowed',
                        opacity: 0.6,
                        alignSelf: 'flex-start',
                      }}
                      title="Inativar (em breve)"
                    >
                      Inativar
                    </button>
                  )}

                  {isAdmin && !rep.ativo && (
                    <button
                      disabled
                      style={{
                        fontSize: '0.72rem',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius)',
                        border: '1.5px solid var(--success)',
                        background: 'var(--success-bg)',
                        color: 'var(--success)',
                        fontWeight: 600,
                        cursor: 'not-allowed',
                        opacity: 0.6,
                        alignSelf: 'flex-start',
                      }}
                      title="Reativar (em breve)"
                    >
                      Reativar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatMini({ value, label }: { value: string | number; label: string }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '12px 16px',
        textAlign: 'center',
      }}
    >
      <strong
        style={{
          display: 'block',
          fontSize: '1.2rem',
          fontWeight: 800,
          color: 'var(--primary)',
        }}
      >
        {value}
      </strong>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{label}</span>
    </div>
  )
}

function RepStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <strong
        style={{
          display: 'block',
          fontSize: '1rem',
          fontWeight: 800,
          color: 'var(--primary)',
        }}
      >
        {value}
      </strong>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{label}</span>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: 'var(--radius)',
        border: active ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
        background: active ? 'var(--primary)' : 'var(--surface)',
        color: active ? '#fff' : 'var(--text-2)',
        fontWeight: 600,
        fontSize: '0.82rem',
        cursor: 'pointer',
        transition: 'var(--transition)',
      }}
    >
      {children}
    </button>
  )
}
