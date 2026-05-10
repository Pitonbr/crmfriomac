import { useState } from 'react'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useEntregas } from '@/hooks/queries/useOrcamentos'
import { useCurrentUser } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui/Spinner'
import { Dialog } from '@/components/ui/Dialog'
import { http } from '@/lib/http'
import { formatDate } from '@/lib/formatters'
import type { Entrega, EntregaStatus } from '@/api/schemas'

import '@/features/clientes/clientes.css'

// ── Types ────────────────────────────────────────────────────────────

interface EntregaExtra extends Entrega {
  satisfacao?: number | null
  retrabalho?: boolean | null
  retrabalho_descricao?: string | null
}

interface EditForm {
  status: EntregaStatus
  prazo_estimado: string
  prazo_real: string
  satisfacao: number
  retrabalho: boolean
  retrabalho_descricao: string
  observacoes: string
}

// ── Constants ─────────────────────────────────────────────────────────

const STATUS_BADGE: Record<EntregaStatus, string> = {
  planejada: 'badge-info',
  em_producao: 'badge-warning',
  entregue: 'badge-success',
  atrasada: 'badge-danger',
}

const STATUS_LABEL: Record<EntregaStatus, string> = {
  planejada: 'Planejada',
  em_producao: 'Em produção',
  entregue: 'Entregue',
  atrasada: 'Atrasada',
}

const STATUS_OPTIONS: { value: EntregaStatus; label: string }[] = [
  { value: 'planejada', label: 'Planejada' },
  { value: 'em_producao', label: 'Em produção' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'atrasada', label: 'Atrasada' },
]

const SATISFACAO_OPTIONS = [
  { value: 5, label: '⭐⭐⭐⭐⭐' },
  { value: 4, label: '⭐⭐⭐⭐' },
  { value: 3, label: '⭐⭐⭐' },
  { value: 2, label: '⭐⭐' },
  { value: 1, label: '⭐' },
]

// ── HTTP helper ───────────────────────────────────────────────────────

async function updateEntrega(id: string, body: object) {
  return http('/api/v1/entregas/' + id, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── Edit Modal ────────────────────────────────────────────────────────

interface EditModalProps {
  entrega: EntregaExtra
  onClose: () => void
  isMaster: boolean
}

function EditModal({ entrega, onClose, isMaster }: EditModalProps) {
  const qc = useQueryClient()

  const [form, setForm] = useState<EditForm>({
    status: entrega.status,
    prazo_estimado: entrega.prazo_estimado?.slice(0, 10) ?? '',
    prazo_real: entrega.prazo_real?.slice(0, 10) ?? '',
    satisfacao: entrega.satisfacao ?? 5,
    retrabalho: entrega.retrabalho ?? false,
    retrabalho_descricao: entrega.retrabalho_descricao ?? '',
    observacoes: entrega.observacoes ?? '',
  })

  const mutation = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        status: form.status,
        prazo_estimado: form.prazo_estimado || null,
        prazo_real: form.prazo_real || null,
        satisfacao: form.satisfacao,
        retrabalho: form.retrabalho,
        retrabalho_descricao: form.retrabalho ? form.retrabalho_descricao : null,
        observacoes: form.observacoes || null,
      }
      return updateEntrega(entrega.id, body)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['entregas'] })
      onClose()
    },
  })

  function set<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const isPrazoRealAtrasado =
    form.status === 'atrasada' ||
    (!!form.prazo_estimado &&
      !!form.prazo_real &&
      form.prazo_real > form.prazo_estimado)

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 38,
    padding: '0 10px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    background: 'var(--surface)',
    color: 'var(--text-1)',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 6,
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-2)',
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title={`📦 Entrega — ${entrega.lead_id.slice(0, 8)}`}
      description=""
      width={600}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', fontSize: '0.8rem', color: 'var(--text-2)' }}>
          <div>
            <strong style={{ display: 'block', marginBottom: 2, color: 'var(--text-3)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>Lead ID</strong>
            <code style={{ fontSize: '0.8rem' }}>{entrega.lead_id}</code>
          </div>
          <div>
            <strong style={{ display: 'block', marginBottom: 2, color: 'var(--text-3)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>Status atual</strong>
            <span className={`badge ${STATUS_BADGE[entrega.status] ?? 'badge-muted'}`}>
              {STATUS_LABEL[entrega.status] ?? entrega.status}
            </span>
          </div>
        </div>

        {/* Status — somente master */}
        {isMaster && (
          <div className="form-group">
            <label htmlFor="edit-status" style={labelStyle}>Status</label>
            <select
              id="edit-status"
              value={form.status}
              onChange={(e) => set('status', e.target.value as EntregaStatus)}
              style={inputStyle}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Satisfação */}
        <div className="form-group">
          <label htmlFor="edit-satisfacao" style={labelStyle}>Satisfação do Cliente</label>
          <select
            id="edit-satisfacao"
            value={form.satisfacao}
            onChange={(e) => set('satisfacao', Number(e.target.value))}
            style={inputStyle}
          >
            {SATISFACAO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Prazos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label htmlFor="edit-prazo-estimado" style={labelStyle}>Prazo Estimado</label>
            <input
              id="edit-prazo-estimado"
              type="date"
              value={form.prazo_estimado}
              onChange={(e) => set('prazo_estimado', e.target.value)}
              style={inputStyle}
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-prazo-real" style={labelStyle}>Prazo Real</label>
            <input
              id="edit-prazo-real"
              type="date"
              value={form.prazo_real}
              onChange={(e) => set('prazo_real', e.target.value)}
              style={{
                ...inputStyle,
                border: `1px solid ${isPrazoRealAtrasado ? 'var(--danger)' : 'var(--border)'}`,
                background: isPrazoRealAtrasado ? 'var(--danger-bg)' : 'var(--surface)',
                color: isPrazoRealAtrasado ? 'var(--danger)' : 'var(--text-1)',
              }}
            />
            {isPrazoRealAtrasado && (
              <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 4, marginBottom: 0 }}>
                Entrega fora do prazo estimado
              </p>
            )}
          </div>
        </div>

        {/* Retrabalho */}
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)' }}>
            <input
              type="checkbox"
              checked={form.retrabalho}
              onChange={(e) => set('retrabalho', e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--danger)' }}
            />
            Houve retrabalho?
          </label>

          {form.retrabalho && (
            <div style={{ marginTop: 10 }}>
              <label
                htmlFor="edit-retrabalho-desc"
                style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', color: 'var(--text-2)' }}
              >
                Descrição do retrabalho
              </label>
              <textarea
                id="edit-retrabalho-desc"
                rows={3}
                value={form.retrabalho_descricao}
                onChange={(e) => set('retrabalho_descricao', e.target.value)}
                placeholder="Descreva o que foi refeito e o motivo..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--surface)',
                  color: 'var(--text-1)',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
        </div>

        {/* Observações */}
        <div className="form-group">
          <label htmlFor="edit-obs" style={labelStyle}>Observações</label>
          <textarea
            id="edit-obs"
            rows={3}
            value={form.observacoes}
            onChange={(e) => set('observacoes', e.target.value)}
            placeholder="Observações internas sobre esta entrega..."
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              color: 'var(--text-1)',
              fontSize: '0.875rem',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Error */}
        {mutation.isError && (
          <p style={{ fontSize: '0.85rem', color: 'var(--danger)', margin: 0 }}>
            Erro ao salvar. Tente novamente.
          </p>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            style={{
              height: 38,
              padding: '0 18px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              color: 'var(--text-1)',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            style={{
              height: 38,
              padding: '0 18px',
              border: 'none',
              borderRadius: 'var(--radius)',
              background: 'var(--accent, #2563eb)',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: mutation.isPending ? 'not-allowed' : 'pointer',
              opacity: mutation.isPending ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {mutation.isPending && <Spinner label="" />}
            Salvar
          </button>
        </div>
      </div>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────

export function PrazosPage() {
  const { data: user } = useCurrentUser()
  const { data, isPending, isError } = useEntregas()
  const [editingId, setEditingId] = useState<string | null>(null)

  const isAdmin = user?.role === 'master'
  const canEdit = user?.role === 'master' || user?.role === 'vendedor'

  if (isPending) {
    return (
      <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
        <Spinner label="Carregando entregas..." />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <p style={{ color: 'var(--danger)' }}>Erro ao carregar entregas.</p>
      </div>
    )
  }

  const entregas = (data ?? []) as EntregaExtra[]
  const atrasadas = entregas.filter((e) => e.status === 'atrasada').length
  const entreguesNoPrazo = entregas.filter((e) => e.status === 'entregue').length
  const emProducao = entregas.filter((e) => e.status === 'em_producao').length
  const editingEntrega = editingId ? entregas.find((e) => e.id === editingId) ?? null : null

  return (
    <div className="page-padded">

      {/* Delivery Alert Banner */}
      {atrasadas > 0 && (
        <div
          className="delivery-alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            background: 'var(--warning-bg, #FEF3C7)',
            border: '1px solid #FCD34D',
            borderRadius: 'var(--radius)',
            marginBottom: 20,
            fontSize: '.85rem',
            color: '#92400E',
          }}
        >
          ⚠️ <strong>{atrasadas} entrega(s) atrasada(s)!</strong> Verificar imediatamente e acionar time de produção.
        </div>
      )}

      {/* Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            textAlign: 'center',
          }}
        >
          <strong style={{ display: 'block', fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
            {entregas.length}
          </strong>
          <span style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>Entregas registradas</span>
        </div>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            textAlign: 'center',
          }}
        >
          <strong style={{ display: 'block', fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)' }}>
            {entreguesNoPrazo}
          </strong>
          <span style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>Entregues no prazo</span>
        </div>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            textAlign: 'center',
          }}
        >
          <strong style={{ display: 'block', fontSize: '1.2rem', fontWeight: 800, color: 'var(--danger)' }}>
            {atrasadas}
          </strong>
          <span style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>Atrasadas</span>
        </div>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            textAlign: 'center',
          }}
        >
          <strong style={{ display: 'block', fontSize: '1.2rem', fontWeight: 800, color: 'var(--warning)' }}>
            {emProducao}
          </strong>
          <span style={{ fontSize: '.72rem', color: 'var(--text-3)' }}>Em produção</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="section-title" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-1)' }}>
          📦 Controle de Prazo de Entrega
        </div>
        {isAdmin && (
          <button
            type="button"
            style={{
              height: 36,
              padding: '0 16px',
              border: 'none',
              borderRadius: 'var(--radius)',
              background: 'var(--accent, #2563eb)',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            + Nova Entrega
          </button>
        )}
      </div>

      {/* Card com tabela */}
      <div className="card" style={{ overflow: 'hidden' }}>

        {/* Policy Banner */}
        <div style={{ padding: '14px 18px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: '.78rem', color: 'var(--text-2)' }}>
          ⚠️ <strong>POLÍTICA FRIOMAC:</strong> 98% de entregas no prazo | Multa contratual por dia de atraso | Garantia de entrega = diferencial Friomac
        </div>

        {/* Empty state */}
        {entregas.length === 0 ? (
          <div className="empty-state" style={{ padding: 50 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
              <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" />
              <path d="M16.5 9.4 7.55 4.24" />
              <polyline points="3.29 7 12 12 20.71 7" />
              <line x1="12" y1="22" x2="12" y2="12" />
              <circle cx="18.5" cy="15.5" r="2.5" />
              <path d="M20.27 17.27 22 19" />
            </svg>
            <h3 style={{ margin: '0 0 8px', fontSize: '1rem', color: 'var(--text-1)' }}>Nenhuma entrega registrada</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-3)' }}>
              Elas são criadas automaticamente quando um lead é marcado como GANHO.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nº Orç</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Pedido</th>
                  <th>Previsão Entrega</th>
                  <th>Entrega Real</th>
                  <th>Dias Atraso</th>
                  <th>Status</th>
                  <th>Multa/Dia</th>
                  <th>Multa Total</th>
                  <th>Satisfação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {entregas.map((e) => {
                  const diasAtraso =
                    e.prazo_real && e.prazo_estimado && e.prazo_real > e.prazo_estimado
                      ? Math.round(
                          (new Date(e.prazo_real).getTime() - new Date(e.prazo_estimado).getTime()) /
                            (1000 * 60 * 60 * 24),
                        )
                      : null

                  return (
                    <tr key={e.id}>
                      {/* Nº Orç */}
                      <td>
                        <code style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-2)' }}>
                          #{e.lead_id.slice(0, 8)}
                        </code>
                      </td>

                      {/* Cliente */}
                      <td style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>—</td>

                      {/* Vendedor */}
                      <td style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>—</td>

                      {/* Pedido */}
                      <td>{formatDate(e.criado_em)}</td>

                      {/* Previsão Entrega */}
                      <td>{formatDate(e.prazo_estimado)}</td>

                      {/* Entrega Real */}
                      <td>
                        {e.prazo_real
                          ? formatDate(e.prazo_real)
                          : <span style={{ color: 'var(--text-3)' }}>—</span>
                        }
                      </td>

                      {/* Dias Atraso */}
                      <td>
                        {diasAtraso !== null ? (
                          <span className="badge badge-danger">+{diasAtraso}d</span>
                        ) : (
                          <span className="badge badge-success">No prazo</span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`badge ${STATUS_BADGE[e.status] ?? 'badge-muted'}`}>
                          {STATUS_LABEL[e.status] ?? e.status}
                        </span>
                      </td>

                      {/* Multa/Dia */}
                      <td style={{ color: 'var(--text-3)' }}>—</td>

                      {/* Multa Total */}
                      <td style={{ color: 'var(--text-3)' }}>—</td>

                      {/* Satisfação */}
                      <td>
                        {e.satisfacao
                          ? <span title={`${e.satisfacao} de 5`}>{'⭐'.repeat(e.satisfacao)}</span>
                          : <span style={{ color: 'var(--text-3)' }}>—</span>
                        }
                      </td>

                      {/* Ações */}
                      <td>
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => setEditingId(e.id)}
                            style={{
                              height: 30,
                              padding: '0 12px',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius)',
                              background: 'var(--surface)',
                              color: 'var(--text-1)',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Editar
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingEntrega && (
        <EditModal
          entrega={editingEntrega}
          isMaster={isAdmin}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  )
}
