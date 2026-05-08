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

/** Campos extras que o backend pode devolver mas ainda não estão no schema base */
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

// ── Sub-components ────────────────────────────────────────────────────

function SatisfacaoStars({ value }: { value: number | null | undefined }) {
  if (!value) return <span style={{ color: 'var(--text-3)' }}>—</span>
  return <span title={`${value} de 5`}>{'⭐'.repeat(value)}</span>
}

function TruncatedText({ text, maxLen = 60 }: { text: string | null | undefined; maxLen?: number }) {
  if (!text) return <span style={{ color: 'var(--text-3)' }}>—</span>
  if (text.length <= maxLen) return <span>{text}</span>
  return (
    <span title={text}>
      {text.slice(0, maxLen)}
      <span style={{ color: 'var(--text-3)' }}>…</span>
    </span>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────

interface EditModalProps {
  entrega: EntregaExtra
  onClose: () => void
}

function EditModal({ entrega, onClose }: EditModalProps) {
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

  return (
    <Dialog
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title="Editar Entrega"
      description={`Lead ${entrega.lead_id.slice(0, 8)}`}
      width={600}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Status */}
        <div className="form-group">
          <label
            htmlFor="edit-status"
            style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)' }}
          >
            Status
          </label>
          <select
            id="edit-status"
            value={form.status}
            onChange={(e) => set('status', e.target.value as EntregaStatus)}
            style={{
              width: '100%',
              height: 38,
              padding: '0 10px',
              border: 'var(--border-w, 1px) solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              color: 'var(--text-1)',
              fontSize: '0.875rem',
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Prazos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label
              htmlFor="edit-prazo-estimado"
              style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)' }}
            >
              Prazo Estimado
            </label>
            <input
              id="edit-prazo-estimado"
              type="date"
              value={form.prazo_estimado}
              onChange={(e) => set('prazo_estimado', e.target.value)}
              style={{
                width: '100%',
                height: 38,
                padding: '0 10px',
                border: 'var(--border-w, 1px) solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--surface)',
                color: 'var(--text-1)',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div className="form-group">
            <label
              htmlFor="edit-prazo-real"
              style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)' }}
            >
              Prazo Real
            </label>
            <input
              id="edit-prazo-real"
              type="date"
              value={form.prazo_real}
              onChange={(e) => set('prazo_real', e.target.value)}
              style={{
                width: '100%',
                height: 38,
                padding: '0 10px',
                border: `var(--border-w, 1px) solid ${isPrazoRealAtrasado ? 'var(--danger)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                background: isPrazoRealAtrasado ? 'var(--danger-bg)' : 'var(--surface)',
                color: isPrazoRealAtrasado ? 'var(--danger)' : 'var(--text-1)',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
            {isPrazoRealAtrasado && (
              <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: 4 }}>
                Entrega fora do prazo estimado
              </p>
            )}
          </div>
        </div>

        {/* Satisfação */}
        <div className="form-group">
          <label
            htmlFor="edit-satisfacao"
            style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)' }}
          >
            Satisfação do Cliente
          </label>
          <select
            id="edit-satisfacao"
            value={form.satisfacao}
            onChange={(e) => set('satisfacao', Number(e.target.value))}
            style={{
              width: '100%',
              height: 38,
              padding: '0 10px',
              border: 'var(--border-w, 1px) solid var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              color: 'var(--text-1)',
              fontSize: '0.875rem',
            }}
          >
            {SATISFACAO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Retrabalho */}
        <div className="form-group">
          <label
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-1)' }}
          >
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
                  border: 'var(--border-w, 1px) solid var(--border)',
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
          <label
            htmlFor="edit-obs"
            style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)' }}
          >
            Observações
          </label>
          <textarea
            id="edit-obs"
            rows={3}
            value={form.observacoes}
            onChange={(e) => set('observacoes', e.target.value)}
            placeholder="Observações internas sobre esta entrega..."
            style={{
              width: '100%',
              padding: '8px 10px',
              border: 'var(--border-w, 1px) solid var(--border)',
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

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            style={{
              height: 38,
              padding: '0 18px',
              border: 'var(--border-w, 1px) solid var(--border)',
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
  const editingEntrega = editingId ? entregas.find((e) => e.id === editingId) ?? null : null

  return (
    <div className="page-padded">

      {/* Alert banner */}
      {atrasadas > 0 && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            borderRadius: 'var(--radius)',
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          <span aria-hidden>⚠</span>
          <span>
            {atrasadas} entrega{atrasadas !== 1 ? 's' : ''} com atraso — verifique imediatamente e acione o time de produção.
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="page-toolbar">
        <h1>Prazo de Entrega</h1>
        <span className="page-count">{entregas.length} entregas</span>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Status</th>
              <th>Prazo Estimado</th>
              <th>Prazo Real</th>
              <th>Satisfação</th>
              <th>Retrabalho</th>
              <th>Observações</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {entregas.map((e) => (
              <tr key={e.id}>
                {/* Lead */}
                <td>
                  <code style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                    {e.lead_id.slice(0, 8)}…
                  </code>
                </td>

                {/* Status */}
                <td>
                  <span className={`badge ${STATUS_BADGE[e.status] ?? 'badge-muted'}`}>
                    {STATUS_LABEL[e.status] ?? e.status}
                  </span>
                </td>

                {/* Prazo Estimado */}
                <td>{formatDate(e.prazo_estimado)}</td>

                {/* Prazo Real */}
                <td
                  style={{
                    color: e.status === 'atrasada' ? 'var(--danger)' : undefined,
                    fontWeight: e.status === 'atrasada' ? 600 : undefined,
                  }}
                >
                  {formatDate(e.prazo_real)}
                </td>

                {/* Satisfação */}
                <td>
                  <SatisfacaoStars value={e.satisfacao} />
                </td>

                {/* Retrabalho */}
                <td>
                  {e.retrabalho ? (
                    <span className="badge badge-danger" title={e.retrabalho_descricao ?? ''}>
                      Sim
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>—</span>
                  )}
                </td>

                {/* Observações */}
                <td style={{ maxWidth: 260 }}>
                  <TruncatedText text={e.observacoes} maxLen={55} />
                </td>

                {/* Ação */}
                <td>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => setEditingId(e.id)}
                      style={{
                        height: 30,
                        padding: '0 12px',
                        border: 'var(--border-w, 1px) solid var(--border)',
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
            ))}

            {entregas.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: 'center', padding: 48, color: 'var(--text-3)' }}
                >
                  Nenhuma entrega ainda. Elas são criadas automaticamente quando um lead é marcado como GANHO.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingEntrega && (
        <EditModal
          entrega={editingEntrega}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  )
}
