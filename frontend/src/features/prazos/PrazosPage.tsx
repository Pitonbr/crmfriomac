import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import {
  useCreateEntrega,
  useEntregas,
  useUpdateEntrega,
} from '@/hooks/queries/useOrcamentos'
import { useLeads } from '@/hooks/queries/useLeads'
import { useClientes } from '@/hooks/queries/useClientes'
import { useRepresentantes } from '@/hooks/queries/useRepresentantes'
import { useCurrentUser } from '@/hooks/useAuth'
import type { Entrega, EntregaStatus } from '@/api/schemas'
import { formatDate } from '@/lib/formatters'

import '@/features/clientes/clientes.css'
import './prazos.css'

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<EntregaStatus, string> = {
  planejada:    'badge-info',
  em_producao:  'badge-warning',
  entregue:     'badge-success',
  atrasada:     'badge-danger',
}

const STATUS_LABEL: Record<EntregaStatus, string> = {
  planejada:    '📋 Planejada',
  em_producao:  '⚙️ Em Produção',
  entregue:     '✅ Entregue',
  atrasada:     '⚠️ Atrasada',
}

const STATUS_OPTIONS: { value: EntregaStatus; label: string }[] = [
  { value: 'planejada',   label: 'Planejada' },
  { value: 'em_producao', label: 'Em Produção' },
  { value: 'entregue',    label: 'Entregue' },
  { value: 'atrasada',    label: 'Atrasada' },
]

// ── Edit Modal ─────────────────────────────────────────────────────────────

interface EditModalProps {
  entrega: Entrega
  clienteNome: string
  leadCodigo: string
  leadProjeto: string
  isMaster: boolean
  onClose: () => void
}

function EditModal({ entrega, clienteNome, leadCodigo, leadProjeto, isMaster, onClose }: EditModalProps) {
  const updateEntrega = useUpdateEntrega()

  const [status, setStatus] = useState<EntregaStatus>(entrega.status)
  const [prazoEstimado, setPrazoEstimado] = useState(entrega.prazo_estimado?.slice(0, 10) ?? '')
  const [prazoReal, setPrazoReal] = useState(entrega.prazo_real?.slice(0, 10) ?? '')
  const [satisfacao, setSatisfacao] = useState<number>(entrega.satisfacao ?? 0)
  const [retrabalho, setRetrabalho] = useState(entrega.retrabalho ?? false)
  const [retrabalhoDesc, setRetrabalhoDesc] = useState(entrega.retrabalho_desc ?? '')
  const [observacoes, setObservacoes] = useState(entrega.observacoes ?? '')

  const isAtrasado = !!prazoEstimado && !!prazoReal && prazoReal > prazoEstimado

  const handleSave = async () => {
    try {
      await updateEntrega.mutateAsync({
        id: entrega.id,
        payload: {
          status,
          prazo_estimado: prazoEstimado || null,
          prazo_real: prazoReal || null,
          satisfacao: satisfacao > 0 ? satisfacao : null,
          retrabalho,
          retrabalho_desc: retrabalho ? retrabalhoDesc.trim() || null : null,
          observacoes: observacoes.trim() || null,
        },
      })
      toast.success('Entrega atualizada com sucesso')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  return (
    <Dialog
      open
      onOpenChange={o => { if (!o) onClose() }}
      title={`📦 Entrega — Lead #${leadCodigo}`}
      description={clienteNome + (leadProjeto ? ` · ${leadProjeto}` : '')}
      width={580}
    >
      <div className="pz-form">

        {/* Info */}
        <div className="pz-info-grid">
          <PzField label="Lead" value={`#${leadCodigo}`} />
          <PzField label="Cliente" value={clienteNome} />
          {leadProjeto && <PzField label="Projeto" value={leadProjeto} />}
          <div>
            <span className="pz-label">Status atual</span>
            <span className={`badge ${STATUS_BADGE[entrega.status] ?? 'badge-muted'}`}>
              {STATUS_LABEL[entrega.status]}
            </span>
          </div>
        </div>

        {/* Status */}
        {isMaster && (
          <div className="pz-field">
            <label className="pz-label">Alterar Status</label>
            <select className="pz-input" value={status} onChange={e => setStatus(e.target.value as EntregaStatus)}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}

        {/* Prazos */}
        <div className="pz-grid-2">
          <div className="pz-field">
            <label className="pz-label">Prazo Estimado</label>
            <input type="date" className="pz-input" value={prazoEstimado} onChange={e => setPrazoEstimado(e.target.value)} />
          </div>
          <div className="pz-field">
            <label className="pz-label">Data Real de Entrega</label>
            <input
              type="date"
              className={`pz-input${isAtrasado ? ' pz-input-danger' : ''}`}
              value={prazoReal}
              onChange={e => setPrazoReal(e.target.value)}
            />
            {isAtrasado && <span className="pz-hint-danger">Fora do prazo estimado</span>}
          </div>
        </div>

        {/* Satisfação */}
        <div className="pz-field">
          <label className="pz-label">Satisfação do Cliente</label>
          <div className="pz-stars">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                className={`pz-star${satisfacao >= n ? ' active' : ''}`}
                onClick={() => setSatisfacao(satisfacao === n ? 0 : n)}
                title={`${n} estrela${n > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
            {satisfacao > 0 && (
              <span className="pz-star-label">{satisfacao}/5</span>
            )}
          </div>
        </div>

        {/* Retrabalho */}
        <div className="pz-field">
          <label className="pz-checkbox-label">
            <input
              type="checkbox"
              checked={retrabalho}
              onChange={e => setRetrabalho(e.target.checked)}
            />
            Houve retrabalho nesta entrega?
          </label>
          {retrabalho && (
            <textarea
              className="pz-textarea"
              rows={3}
              value={retrabalhoDesc}
              onChange={e => setRetrabalhoDesc(e.target.value)}
              placeholder="Descreva o que foi refeito e o motivo..."
            />
          )}
        </div>

        {/* Observações */}
        <div className="pz-field">
          <label className="pz-label">Observações</label>
          <textarea
            className="pz-textarea"
            rows={3}
            value={observacoes}
            onChange={e => setObservacoes(e.target.value)}
            placeholder="Observações internas sobre esta entrega..."
          />
        </div>

        {/* Buttons */}
        <div className="pz-footer">
          <button type="button" className="pz-btn-cancel" onClick={onClose} disabled={updateEntrega.isPending}>
            Cancelar
          </button>
          <button type="button" className="pz-btn-save" onClick={() => void handleSave()} disabled={updateEntrega.isPending}>
            {updateEntrega.isPending ? 'Salvando...' : '✓ Salvar'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

// ── Nova Entrega Modal ─────────────────────────────────────────────────────

interface NovaEntregaModalProps {
  leadsDisponiveis: { id: string; codigo: string; clienteNome: string; projeto: string }[]
  onClose: () => void
}

function NovaEntregaModal({ leadsDisponiveis, onClose }: NovaEntregaModalProps) {
  const createEntrega = useCreateEntrega()
  const [leadId, setLeadId] = useState(leadsDisponiveis[0]?.id ?? '')
  const [prazoEstimado, setPrazoEstimado] = useState('')
  const [statusVal, setStatusVal] = useState<EntregaStatus>('planejada')
  const [obs, setObs] = useState('')

  const handleSubmit = async () => {
    if (!leadId) { toast.warning('Selecione um lead'); return }
    if (!prazoEstimado) { toast.warning('Informe o prazo estimado'); return }
    try {
      await createEntrega.mutateAsync({ lead_id: leadId, prazo_estimado: prazoEstimado, status: statusVal, observacoes: obs.trim() || null })
      toast.success('Entrega criada com sucesso')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar')
    }
  }

  if (leadsDisponiveis.length === 0) {
    return (
      <Dialog open onOpenChange={o => { if (!o) onClose() }} title="Nova Entrega" width={480}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ color: 'var(--text-3)', fontSize: '.875rem' }}>
            Todos os leads ganhos já possuem entrega registrada.
          </p>
          <p style={{ fontSize: '.8rem', color: 'var(--text-3)' }}>
            Entregas são criadas automaticamente ao marcar um lead como Ganho.
          </p>
          <button type="button" className="pz-btn-cancel" onClick={onClose} style={{ marginTop: 16 }}>Fechar</button>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }} title="📦 Nova Entrega" description="Vincule um lead ganho a uma nova entrega" width={500}>
      <div className="pz-form">
        <div className="pz-field">
          <label className="pz-label">Lead (ganho) *</label>
          <select className="pz-input" value={leadId} onChange={e => setLeadId(e.target.value)}>
            {leadsDisponiveis.map(l => (
              <option key={l.id} value={l.id}>
                #{l.codigo} — {l.clienteNome}{l.projeto ? ` · ${l.projeto}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="pz-grid-2">
          <div className="pz-field">
            <label className="pz-label">Prazo Estimado *</label>
            <input type="date" className="pz-input" value={prazoEstimado} onChange={e => setPrazoEstimado(e.target.value)} />
          </div>
          <div className="pz-field">
            <label className="pz-label">Status Inicial</label>
            <select className="pz-input" value={statusVal} onChange={e => setStatusVal(e.target.value as EntregaStatus)}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="pz-field">
          <label className="pz-label">Observações</label>
          <textarea className="pz-textarea" rows={2} value={obs} onChange={e => setObs(e.target.value)} placeholder="Observações iniciais..." />
        </div>
        <div className="pz-footer">
          <button type="button" className="pz-btn-cancel" onClick={onClose}>Cancelar</button>
          <button type="button" className="pz-btn-save" onClick={() => void handleSubmit()} disabled={createEntrega.isPending}>
            {createEntrega.isPending ? 'Criando...' : '+ Criar Entrega'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function PrazosPage() {
  const { data: user } = useCurrentUser()
  const { data: entregas = [], isPending: entregasPending } = useEntregas()
  const { data: leads = [] } = useLeads()
  const { data: clientes = [] } = useClientes()
  const { data: reps = [] } = useRepresentantes()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNova, setShowNova] = useState(false)
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<EntregaStatus | 'todos'>('todos')

  const isAdmin = user?.role === 'master'
  const canEdit = user?.role === 'master' || user?.role === 'vendedor'

  // Maps for enrichment
  const leadsMap = useMemo(() => new Map(leads.map(l => [l.id, l])), [leads])
  const clientesMap = useMemo(() => new Map(clientes.map(c => [c.id, c])), [clientes])
  const repsMap = useMemo(() => new Map(reps.map(r => [r.id, r])), [reps])

  // Enrich entregas with lead/cliente/rep data
  const entregasRicas = useMemo(() => entregas.map(e => {
    const lead = leadsMap.get(e.lead_id)
    const cliente = lead ? clientesMap.get(lead.cliente_id) : undefined
    const rep = lead?.representante_id ? repsMap.get(lead.representante_id) : undefined
    return {
      ...e,
      leadCodigo: lead?.codigo ?? e.lead_id.slice(0, 8),
      clienteNome: cliente?.nome_fantasia ?? '—',
      projeto: lead?.projeto ?? '',
      repNome: rep?.nome ?? '—',
    }
  }), [entregas, leadsMap, clientesMap, repsMap])

  // Stats
  const stats = useMemo(() => ({
    total: entregas.length,
    planejadas: entregas.filter(e => e.status === 'planejada').length,
    emProducao: entregas.filter(e => e.status === 'em_producao').length,
    entregues: entregas.filter(e => e.status === 'entregue').length,
    atrasadas: entregas.filter(e => e.status === 'atrasada').length,
  }), [entregas])

  // Filter
  const filtered = useMemo(() => {
    let list = entregasRicas
    if (statusFiltro !== 'todos') list = list.filter(e => e.status === statusFiltro)
    if (busca.trim()) {
      const q = busca.toLowerCase()
      list = list.filter(e =>
        e.leadCodigo.toLowerCase().includes(q) ||
        e.clienteNome.toLowerCase().includes(q) ||
        (e.projeto?.toLowerCase().includes(q) ?? false) ||
        e.repNome.toLowerCase().includes(q),
      )
    }
    return list
  }, [entregasRicas, statusFiltro, busca])

  // Leads available for new entrega (ganho leads without existing entrega)
  const entregaLeadIds = useMemo(() => new Set(entregas.map(e => e.lead_id)), [entregas])
  const leadsDisponiveis = useMemo(() =>
    leads
      .filter(l => l.status === 'ganho' && !entregaLeadIds.has(l.id))
      .map(l => ({
        id: l.id,
        codigo: l.codigo,
        clienteNome: clientesMap.get(l.cliente_id)?.nome_fantasia ?? '—',
        projeto: l.projeto ?? '',
      })),
    [leads, entregaLeadIds, clientesMap],
  )

  const editingEntrega = editingId ? entregasRicas.find(e => e.id === editingId) : null

  if (entregasPending) {
    return <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}><Spinner label="Carregando entregas..." /></div>
  }

  return (
    <div className="page-padded">

      {/* Alert Banner */}
      {stats.atrasadas > 0 && (
        <div className="pz-alert-banner">
          ⚠️ <strong>{stats.atrasadas} entrega{stats.atrasadas > 1 ? 's' : ''} atrasada{stats.atrasadas > 1 ? 's' : ''}!</strong>
          {' '}Verificar imediatamente e acionar time de produção.
        </div>
      )}

      {/* Stats Cards */}
      <div className="pz-stats-row">
        <StatCard value={stats.total}       label="Total"        icon="📦" color="var(--primary)" onClick={() => setStatusFiltro('todos')} active={statusFiltro === 'todos'} />
        <StatCard value={stats.planejadas}  label="Planejadas"   icon="📋" color="var(--info)"    onClick={() => setStatusFiltro(statusFiltro === 'planejada' ? 'todos' : 'planejada')} active={statusFiltro === 'planejada'} />
        <StatCard value={stats.emProducao}  label="Em Produção"  icon="⚙️" color="var(--warning)" onClick={() => setStatusFiltro(statusFiltro === 'em_producao' ? 'todos' : 'em_producao')} active={statusFiltro === 'em_producao'} />
        <StatCard value={stats.entregues}   label="Entregues"    icon="✅" color="var(--success)" onClick={() => setStatusFiltro(statusFiltro === 'entregue' ? 'todos' : 'entregue')} active={statusFiltro === 'entregue'} />
        <StatCard value={stats.atrasadas}   label="Atrasadas"    icon="⚠️" color="var(--danger)"  onClick={() => setStatusFiltro(statusFiltro === 'atrasada' ? 'todos' : 'atrasada')} active={statusFiltro === 'atrasada'} />
      </div>

      {/* Toolbar */}
      <div className="page-toolbar">
        <h1>📦 Controle de Prazo de Entrega</h1>
        <input
          type="search"
          placeholder="Buscar por código, cliente, projeto..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
        <span style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
        {isAdmin && (
          <button type="button" className="pz-novo-btn" onClick={() => setShowNova(true)}>
            + Nova Entrega
          </button>
        )}
      </div>

      {/* Policy banner */}
      <div className="pz-policy-banner">
        ⚠️ <strong>POLÍTICA FRIOMAC:</strong> 98% de entregas no prazo · Multa contratual por dia de atraso · Garantia de entrega = diferencial Friomac
      </div>

      {/* Table */}
      <div className="table-wrap">
        {filtered.length === 0 ? (
          <div style={{ padding: 50, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📦</div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--text-1)' }}>
              {entregas.length === 0 ? 'Nenhuma entrega registrada' : 'Nenhum resultado encontrado'}
            </h3>
            <p style={{ margin: 0, fontSize: '.875rem', color: 'var(--text-3)' }}>
              {entregas.length === 0
                ? 'Entregas são criadas automaticamente quando um lead é marcado como Ganho.'
                : 'Tente ajustar o filtro ou a busca.'}
            </p>
          </div>
        ) : (
          <table className="data-table pz-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Projeto</th>
                <th>Representante</th>
                <th>Previsão</th>
                <th>Entregue em</th>
                <th>Prazo</th>
                <th>Status</th>
                <th>Satisfação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const diasAtraso = e.prazo_real && e.prazo_estimado && e.prazo_real > e.prazo_estimado
                  ? Math.round((new Date(e.prazo_real).getTime() - new Date(e.prazo_estimado).getTime()) / 86_400_000)
                  : null

                const emAtraso = !e.prazo_real && e.prazo_estimado && new Date(e.prazo_estimado) < new Date()
                  && e.status !== 'entregue'

                return (
                  <tr key={e.id} className={emAtraso ? 'pz-row-atrasada' : ''}>
                    <td>
                      <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>#{e.leadCodigo}</strong>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, fontSize: '.875rem' }}>{e.clienteNome}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '.82rem', color: 'var(--text-2)' }}>{e.projeto || '—'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '.82rem' }}>{e.repNome}</span>
                    </td>
                    <td>
                      {e.prazo_estimado
                        ? <span className={emAtraso ? 'pz-date-danger' : ''}>{formatDate(e.prazo_estimado)}</span>
                        : <span style={{ color: 'var(--text-3)' }}>—</span>
                      }
                    </td>
                    <td>
                      {e.prazo_real
                        ? <span className={diasAtraso !== null ? 'pz-date-danger' : 'pz-date-ok'}>{formatDate(e.prazo_real)}</span>
                        : <span style={{ color: 'var(--text-3)' }}>—</span>
                      }
                    </td>
                    <td>
                      {diasAtraso !== null
                        ? <span className="badge badge-danger">+{diasAtraso}d atraso</span>
                        : emAtraso
                          ? <span className="badge badge-danger">Vencido</span>
                          : <span className="badge badge-success">No prazo</span>
                      }
                      {e.retrabalho && <span className="pz-badge-retrabalho" title={e.retrabalho_desc ?? ''}>↩ Retrab.</span>}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[e.status]}`}>{STATUS_LABEL[e.status]}</span>
                    </td>
                    <td>
                      {e.satisfacao
                        ? (
                          <span title={`${e.satisfacao}/5 estrelas`} className="pz-stars-display">
                            {'★'.repeat(e.satisfacao)}{'☆'.repeat(5 - e.satisfacao)}
                          </span>
                        )
                        : <span style={{ color: 'var(--text-3)' }}>—</span>
                      }
                    </td>
                    <td>
                      {canEdit
                        ? <button type="button" className="pz-edit-btn" onClick={() => setEditingId(e.id)}>✎ Editar</button>
                        : <span style={{ color: 'var(--text-3)', fontSize: '.8rem' }}>—</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {editingEntrega && (
        <EditModal
          entrega={editingEntrega}
          clienteNome={editingEntrega.clienteNome}
          leadCodigo={editingEntrega.leadCodigo}
          leadProjeto={editingEntrega.projeto}
          isMaster={isAdmin}
          onClose={() => setEditingId(null)}
        />
      )}

      {showNova && (
        <NovaEntregaModal
          leadsDisponiveis={leadsDisponiveis}
          onClose={() => setShowNova(false)}
        />
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ value, label, icon, color, onClick, active }: {
  value: number; label: string; icon: string; color: string; onClick: () => void; active: boolean
}) {
  return (
    <button
      type="button"
      className={`pz-stat-card${active ? ' active' : ''}`}
      style={{ '--pz-stat-color': color } as React.CSSProperties}
      onClick={onClick}
    >
      <span className="pz-stat-icon">{icon}</span>
      <strong className="pz-stat-value">{value}</strong>
      <span className="pz-stat-label">{label}</span>
    </button>
  )
}

function PzField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="pz-label">{label}</span>
      <span style={{ fontSize: '.875rem', color: 'var(--text-1)', fontWeight: 600 }}>{value}</span>
    </div>
  )
}
