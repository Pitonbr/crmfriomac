import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import {
  useRepresentantesAll,
  useCreateRepresentante,
  useUpdateRepresentante,
} from '@/hooks/queries/useRepresentantes'
import { useLeads } from '@/hooks/queries/useLeads'
import { useStages } from '@/hooks/queries/useStages'
import { useClientes } from '@/hooks/queries/useClientes'
import { Spinner } from '@/components/ui/Spinner'
import { Dialog } from '@/components/ui/Dialog'
import { formatBRL } from '@/lib/formatters'
import { useAuthStore } from '@/store/authStore'
import type { Representante, Lead, Stage, Cliente } from '@/api/schemas'
import type { RepCreatePayload, RepUpdatePayload } from '@/api/representantes'
import '@/features/clientes/clientes.css'

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = 'ativos' | 'canal_proprio' | 'representantes' | 'inativos'

interface EnrichedRep extends Representante {
  qtdOrc: number
  totalOrc: number
  fechados: number
  perdidos: number
  taxa: number
  qtdLeadsAtivos: number
}

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

// ── Export leads CSV ─────────────────────────────────────────────────────────

function exportLeadsCSV(
  repNome: string,
  leads: Lead[],
  clientes: Map<string, Cliente>,
  stages: Map<string, Stage>,
) {
  const header = ['Código', 'Cliente', 'Projeto', 'Stage', 'Valor', 'Status', 'Data Abertura']
  const rows = leads.map((l) => [
    l.codigo,
    clientes.get(l.cliente_id)?.nome_fantasia ?? '—',
    l.projeto ?? '—',
    stages.get(l.stage_id)?.label ?? '—',
    String(l.valor),
    l.status,
    l.data_abertura.slice(0, 10),
  ])
  const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads_${repNome.replace(/\s+/g, '_')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Print leads ───────────────────────────────────────────────────────────────

function printLeads(
  repNome: string,
  leads: Lead[],
  clientes: Map<string, Cliente>,
  stages: Map<string, Stage>,
) {
  const rows = leads
    .map(
      (l) => `
    <tr>
      <td>${l.codigo}</td>
      <td>${clientes.get(l.cliente_id)?.nome_fantasia ?? '—'}</td>
      <td>${l.projeto ?? '—'}</td>
      <td>${stages.get(l.stage_id)?.label ?? '—'}</td>
      <td>R$ ${Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      <td>${l.status}</td>
      <td>${l.data_abertura.slice(0, 10)}</td>
    </tr>`,
    )
    .join('')

  const html = `
    <html><head><title>Leads - ${repNome}</title>
    <style>
      body { font-family: sans-serif; font-size: 12px; }
      h2 { margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
      th { background: #f0f0f0; font-weight: 700; }
    </style></head>
    <body>
      <h2>Leads — ${repNome}</h2>
      <table>
        <thead><tr><th>Código</th><th>Cliente</th><th>Projeto</th><th>Stage</th><th>Valor</th><th>Status</th><th>Data</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`

  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.print()
}

// ── RepFormModal ─────────────────────────────────────────────────────────────

interface RepFormModalProps {
  open: boolean
  onClose: () => void
  initial?: Representante | null
  onSave: (payload: RepCreatePayload | RepUpdatePayload) => Promise<void>
  saving: boolean
}

function RepFormModal({ open, onClose, initial, onSave, saving }: RepFormModalProps) {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [canal, setCanal] = useState<'canal_proprio' | 'representante'>(
    initial?.canal ?? 'canal_proprio',
  )
  const [comissao, setComissao] = useState(
    initial?.comissao_pct != null ? String(initial.comissao_pct) : '',
  )
  const [telefone, setTelefone] = useState(initial?.telefone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [cidade, setCidade] = useState(initial?.cidade ?? '')
  const [estado, setEstado] = useState(initial?.estado ?? '')

  // Reset when initial changes
  useMemo(() => {
    setNome(initial?.nome ?? '')
    setCanal(initial?.canal ?? 'canal_proprio')
    setComissao(initial?.comissao_pct != null ? String(initial.comissao_pct) : '')
    setTelefone(initial?.telefone ?? '')
    setEmail(initial?.email ?? '')
    setCidade(initial?.cidade ?? '')
    setEstado(initial?.estado ?? '')
  }, [initial])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    const payload: RepCreatePayload = {
      nome: nome.trim(),
      canal,
      comissao_pct: comissao !== '' ? Number(comissao) : undefined,
      telefone: telefone.trim() || null,
      email: email.trim() || null,
      cidade: cidade.trim() || null,
      estado: estado.trim().slice(0, 2).toUpperCase() || null,
    }
    await onSave(payload)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { if (!v) onClose() }}
      title={initial ? 'Editar Vendedor' : 'Novo Vendedor'}
      width={520}
    >
      <form className="rep-form" onSubmit={(e) => { void handleSubmit(e) }}>
        <div className="rep-field">
          <label>Nome *</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            maxLength={200}
            placeholder="Nome completo"
          />
        </div>

        <div className="rep-field">
          <label>Canal *</label>
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value as 'canal_proprio' | 'representante')}
          >
            <option value="canal_proprio">Canal Próprio</option>
            <option value="representante">Representante</option>
          </select>
        </div>

        <div className="rep-field">
          <label>Comissão %</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={comissao}
            onChange={(e) => setComissao(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="rep-field">
          <label>Telefone</label>
          <input
            type="text"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 99999-9999"
          />
        </div>

        <div className="rep-field">
          <label>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
          />
        </div>

        <div className="rep-grid-2">
          <div className="rep-field">
            <label>Cidade</label>
            <input
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Cidade"
            />
          </div>
          <div className="rep-field">
            <label>Estado</label>
            <input
              type="text"
              value={estado}
              onChange={(e) => setEstado(e.target.value.slice(0, 2))}
              placeholder="SP"
              maxLength={2}
            />
          </div>
        </div>

        <div className="rep-submit-row">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={saving || !nome.trim()}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

// ── RepLeadsModal ─────────────────────────────────────────────────────────────

interface RepLeadsModalProps {
  open: boolean
  onClose: () => void
  rep: EnrichedRep | null
  leads: Lead[]
  clientesMap: Map<string, Cliente>
  stagesMap: Map<string, Stage>
}

function RepLeadsModal({
  open,
  onClose,
  rep,
  leads,
  clientesMap,
  stagesMap,
}: RepLeadsModalProps) {
  const navigate = useNavigate()

  if (!rep) return null

  const repLeads = leads.filter((l) => l.representante_id === rep.id)

  const statusLabel: Record<string, string> = {
    em_aberto: 'Em Aberto',
    ganho: 'Ganho',
    perdido: 'Perdido',
    em_producao: 'Em Produção',
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => { if (!v) onClose() }}
      title={`Leads — ${rep.nome}`}
      width={680}
    >
      <div className="rep-leads-toolbar">
        <span className="rep-leads-count">{repLeads.length} lead{repLeads.length !== 1 ? 's' : ''}</span>
        <button
          className="rep-export-btn"
          onClick={() => exportLeadsCSV(rep.nome, repLeads, clientesMap, stagesMap)}
        >
          CSV
        </button>
        <button
          className="rep-export-btn"
          onClick={() => printLeads(rep.nome, repLeads, clientesMap, stagesMap)}
        >
          Imprimir
        </button>
      </div>

      {repLeads.length === 0 ? (
        <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: '24px 0' }}>
          Nenhum lead encontrado.
        </p>
      ) : (
        <div className="rep-leads-list">
          {repLeads.map((lead) => {
            const stage = stagesMap.get(lead.stage_id)
            const cliente = clientesMap.get(lead.cliente_id)
            return (
              <button
                key={lead.id}
                className="rep-lead-row"
                onClick={() => {
                  navigate(`/clientes/${lead.cliente_id}`)
                  onClose()
                }}
              >
                <span className="cli-lead-codigo">{lead.codigo}</span>
                <div className="cli-lead-info">
                  <div className="cli-lead-projeto">
                    {cliente?.nome_fantasia ?? '—'}
                    {lead.projeto ? ` — ${lead.projeto}` : ''}
                  </div>
                  <div className="cli-lead-date">{lead.data_abertura.slice(0, 10)}</div>
                </div>
                {stage && (
                  <span
                    className="cli-lead-stage"
                    style={{ borderColor: stage.cor, color: stage.cor }}
                  >
                    {stage.label}
                  </span>
                )}
                <span className="cli-lead-valor">{formatBRL(lead.valor)}</span>
                <span className="cli-lead-status" style={{ color: 'var(--text-2)' }}>
                  {statusLabel[lead.status] ?? lead.status}
                </span>
                <span className="cli-lead-arrow">›</span>
              </button>
            )
          })}
        </div>
      )}
    </Dialog>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export function VendedoresPage() {
  const [activeTab, setActiveTab] = useState<Tab>('ativos')
  const [formOpen, setFormOpen] = useState(false)
  const [editRep, setEditRep] = useState<Representante | null>(null)
  const [leadsModalRep, setLeadsModalRep] = useState<EnrichedRep | null>(null)

  const { data: reps = [], isPending: repsPending, isError: repsError } = useRepresentantesAll()
  const { data: leads = [], isPending: leadsPending, isError: leadsError } = useLeads()
  const { data: stages = [] } = useStages()
  const { data: clientes = [] } = useClientes()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'master'

  const createMutation = useCreateRepresentante()
  const updateMutation = useUpdateRepresentante()

  const navigate = useNavigate()

  const isPending = repsPending || leadsPending
  const isError = repsError || leadsError

  // Maps for fast lookups
  const stagesMap = useMemo(() => {
    const m = new Map<string, Stage>()
    stages.forEach((s) => m.set(s.id, s))
    return m
  }, [stages])

  const clientesMap = useMemo(() => {
    const m = new Map<string, Cliente>()
    clientes.forEach((c) => m.set(c.id, c))
    return m
  }, [clientes])

  // ── Enrich reps with lead stats ──────────────────────────────────────────

  const enriched = useMemo<EnrichedRep[]>(() => {
    return reps.map((rep) => {
      const repLeads = leads.filter((l) => l.representante_id === rep.id)
      const qtdOrc = repLeads.filter((l) => l.status === 'em_aberto').length
      const totalOrc = repLeads.reduce((s, l) => s + Number(l.valor), 0)
      const fechados = repLeads.filter((l) => l.status === 'ganho').length
      const perdidos = repLeads.filter((l) => l.status === 'perdido').length
      const taxa = fechados + perdidos > 0 ? (fechados / (fechados + perdidos)) * 100 : 0
      const qtdLeadsAtivos = repLeads.filter((l) => l.status === 'em_aberto').length
      return { ...rep, qtdOrc, totalOrc, fechados, perdidos, taxa, qtdLeadsAtivos }
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
    if (activeTab === 'canal_proprio')
      return enriched.filter((r) => r.ativo && r.canal === 'canal_proprio')
    if (activeTab === 'representantes')
      return enriched.filter((r) => r.ativo && r.canal === 'representante')
    if (activeTab === 'inativos') return enriched.filter((r) => !r.ativo)
    return enriched
  }, [enriched, activeTab])

  // ── Filtered stats ───────────────────────────────────────────────────────

  const filteredStats = useMemo(
    () => ({
      count: filtered.length,
      leadsAtivos: filtered.reduce((s, r) => s + r.qtdLeadsAtivos, 0),
      fechados: filtered.reduce((s, r) => s + r.fechados, 0),
      totalOrc: filtered.reduce((s, r) => s + r.totalOrc, 0),
    }),
    [filtered],
  )

  // ── Handlers ─────────────────────────────────────────────────────────────

  function openNew() {
    setEditRep(null)
    setFormOpen(true)
  }

  function openEdit(rep: Representante) {
    setEditRep(rep)
    setFormOpen(true)
  }

  async function handleSave(payload: RepCreatePayload | RepUpdatePayload) {
    if (editRep) {
      await updateMutation.mutateAsync({ id: editRep.id, payload: payload as RepUpdatePayload })
      toast.success('Vendedor atualizado com sucesso.')
    } else {
      await createMutation.mutateAsync(payload as RepCreatePayload)
      toast.success('Vendedor criado com sucesso.')
    }
    setFormOpen(false)
    setEditRep(null)
  }

  async function handleInativar(rep: Representante) {
    if (!confirm(`Inativar "${rep.nome}"?`)) return
    await updateMutation.mutateAsync({ id: rep.id, payload: { ativo: false } })
    toast.success(`${rep.nome} inativado.`)
  }

  async function handleReativar(rep: Representante) {
    await updateMutation.mutateAsync({ id: rep.id, payload: { ativo: true } })
    toast.success(`${rep.nome} reativado.`)
  }

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

  const isSaving = createMutation.isPending || updateMutation.isPending

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
        <StatMini value={filteredStats.count} label="Vendedores" />
        <StatMini value={filteredStats.leadsAtivos} label="Leads Ativos" />
        <StatMini value={filteredStats.fechados} label="Fechados" />
        <StatMini value={formatBRL(filteredStats.totalOrc)} label="Total Orçado" />
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="page-toolbar" style={{ gap: 8 }}>
        <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
          <TabButton active={activeTab === 'ativos'} onClick={() => setActiveTab('ativos')}>
            Todos Ativos ({cntAtivos})
          </TabButton>
          <TabButton
            active={activeTab === 'canal_proprio'}
            onClick={() => setActiveTab('canal_proprio')}
          >
            Canal Próprio ({cntCanalProprio})
          </TabButton>
          <TabButton
            active={activeTab === 'representantes'}
            onClick={() => setActiveTab('representantes')}
          >
            Representantes ({cntRepresentantes})
          </TabButton>
          <TabButton active={activeTab === 'inativos'} onClick={() => setActiveTab('inativos')}>
            Inativos ({cntInativos})
          </TabButton>
        </div>

        {isAdmin && (
          <button className="btn-primary" onClick={openNew}>
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
                        <span style={{ fontSize: '1.1rem' }} title={`${rank ?? ''}º lugar`}>
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
                    {rep.telefone && <span>📞 {rep.telefone}</span>}
                    {rep.email && <span>✉ {rep.email}</span>}
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
                      {isAdmin && (
                        <button
                          style={{
                            fontSize: '0.75rem',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius)',
                            border: '1.5px solid var(--border-2)',
                            background: 'var(--surface)',
                            color: 'var(--text-2)',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          onClick={() => openEdit(rep)}
                        >
                          Editar
                        </button>
                      )}
                      <button
                        style={{
                          fontSize: '0.75rem',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius)',
                          border: '1.5px solid var(--border-2)',
                          background: 'var(--surface)',
                          color: 'var(--text-2)',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        onClick={() => setLeadsModalRep(rep)}
                      >
                        Leads ({rep.qtdOrc + rep.fechados + rep.perdidos})
                      </button>
                    </div>
                  </div>

                  {isAdmin && rep.ativo && (
                    <button
                      style={{
                        fontSize: '0.72rem',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius)',
                        border: '1.5px solid var(--danger)',
                        background: 'var(--danger-bg)',
                        color: 'var(--danger)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        alignSelf: 'flex-start',
                      }}
                      onClick={() => void handleInativar(rep)}
                    >
                      Inativar
                    </button>
                  )}

                  {isAdmin && !rep.ativo && (
                    <button
                      style={{
                        fontSize: '0.72rem',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius)',
                        border: '1.5px solid var(--success)',
                        background: 'var(--success-bg)',
                        color: 'var(--success)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        alignSelf: 'flex-start',
                      }}
                      onClick={() => void handleReativar(rep)}
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

      {/* ── Rep Form Modal ────────────────────────────────────────────── */}
      <RepFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditRep(null)
        }}
        initial={editRep}
        onSave={handleSave}
        saving={isSaving}
      />

      {/* ── Rep Leads Modal ───────────────────────────────────────────── */}
      <RepLeadsModal
        open={leadsModalRep !== null}
        onClose={() => setLeadsModalRep(null)}
        rep={leadsModalRep}
        leads={leads}
        clientesMap={clientesMap}
        stagesMap={stagesMap}
      />

      {/* Suppressed navigate usage to avoid lint — it's used inside RepLeadsModal via closure */}
      <span style={{ display: 'none' }} data-navigate={String(!!navigate)} />
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
