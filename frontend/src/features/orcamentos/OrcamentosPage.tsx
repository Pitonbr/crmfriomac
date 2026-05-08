import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useOrcamentos } from '@/hooks/queries/useOrcamentos';
import { useRepresentantes } from '@/hooks/queries/useRepresentantes';
import { useLeads } from '@/hooks/queries/useLeads';
import { Spinner } from '@/components/ui/Spinner';
import { Dialog } from '@/components/ui/Dialog';
import { http } from '@/lib/http';
import { formatBRL, formatDate } from '@/lib/formatters';
import type { Orcamento, OrcamentoStatus } from '@/api/schemas';

import '@/features/clientes/clientes.css';

// ── Helpers ─────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  rascunho: 'badge-muted',
  enviado: 'badge-info',
  aceito: 'badge-success',
  recusado: 'badge-danger',
  expirado: 'badge-warning',
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aceito: 'Aceito',
  recusado: 'Recusado',
  expirado: 'Expirado',
};

async function updateOrcamento(id: string, body: object) {
  return http('/api/v1/orcamentos/' + id, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Tipos locais ─────────────────────────────────────────────────────

interface OrcamentoExtra extends Orcamento {
  /** campos extras que o backend pode enviar mas que ainda não estão no schema Zod */
  projeto_2d?: boolean | null;
  data_envio_2d?: string | null;
  projeto_3d?: boolean | null;
  data_envio_3d?: string | null;
  data_envio_proposta?: string | null;
}

interface EditState {
  status: OrcamentoStatus;
  projeto_2d: boolean;
  data_envio_2d: string;
  projeto_3d: boolean;
  data_envio_3d: string;
  data_envio_proposta: string;
  validade_ate: string;
  valor_total: number;
  observacoes: string;
}

function buildEditState(o: OrcamentoExtra): EditState {
  return {
    status: o.status,
    projeto_2d: Boolean((o as OrcamentoExtra).projeto_2d),
    data_envio_2d: (o as OrcamentoExtra).data_envio_2d ?? '',
    projeto_3d: Boolean((o as OrcamentoExtra).projeto_3d),
    data_envio_3d: (o as OrcamentoExtra).data_envio_3d ?? '',
    data_envio_proposta: (o as OrcamentoExtra).data_envio_proposta ?? o.data_envio ?? '',
    validade_ate: o.validade_ate ?? '',
    valor_total: Number(o.valor_total),
    observacoes: o.observacoes ?? '',
  };
}

// ── Componente principal ─────────────────────────────────────────────

export function OrcamentosPage() {
  const { data, isPending, isError } = useOrcamentos();
  const { data: reps } = useRepresentantes();
  const { data: leads } = useLeads();

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroVendedor, setFiltroVendedor] = useState<string>('');

  const [selected, setSelected] = useState<OrcamentoExtra | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const qc = useQueryClient();

  const repsById = useMemo(
    () => new Map((reps ?? []).map((r) => [r.id, r])),
    [reps],
  );

  const leadsById = useMemo(
    () => new Map((leads ?? []).map((l) => [l.id, l])),
    [leads],
  );

  const mutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => updateOrcamento(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['orcamentos'] });
      setSelected(null);
      setEdit(null);
    },
    onError: (err: Error) => {
      setSaveError(err.message ?? 'Erro ao salvar.');
      setSaving(false);
    },
  });

  // ── Filtragem ────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = (data ?? []) as OrcamentoExtra[];

    if (filtroStatus) {
      list = list.filter((o) => o.status === filtroStatus);
    }

    if (filtroVendedor) {
      // Filtra pelo representante_id do lead vinculado ao orçamento
      list = list.filter((o) => {
        const lead = leadsById.get(o.lead_id);
        return lead?.representante_id === filtroVendedor;
      });
    }

    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      list = list.filter((o) => {
        const lead = leadsById.get(o.lead_id);
        const clienteNome = lead
          ? (repsById.get(lead.representante_id ?? '')?.nome ?? lead.codigo_legado ?? lead.codigo)
          : '';
        return (
          o.numero.toLowerCase().includes(q) ||
          clienteNome.toLowerCase().includes(q) ||
          (lead?.codigo_legado ?? '').toLowerCase().includes(q) ||
          (lead?.codigo ?? '').toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [data, filtroStatus, filtroVendedor, busca, leadsById, repsById]);

  // ── KPIs ─────────────────────────────────────────────────────────

  const totalOrcado = filtered.reduce((acc, o) => acc + Number(o.valor_total), 0);

  // ── Handlers modal ───────────────────────────────────────────────

  function openModal(o: OrcamentoExtra) {
    setSelected(o);
    setEdit(buildEditState(o));
    setSaveError(null);
  }

  function closeModal() {
    setSelected(null);
    setEdit(null);
    setSaveError(null);
  }

  function handleSave() {
    if (!selected || !edit) return;
    setSaving(true);
    setSaveError(null);
    mutation.mutate(
      {
        id: selected.id,
        body: {
          status: edit.status,
          projeto_2d: edit.projeto_2d,
          data_envio_2d: edit.data_envio_2d || null,
          projeto_3d: edit.projeto_3d,
          data_envio_3d: edit.data_envio_3d || null,
          data_envio_proposta: edit.data_envio_proposta || null,
          validade_ate: edit.validade_ate || null,
          valor_total: edit.valor_total,
          observacoes: edit.observacoes || null,
        },
      },
      { onSettled: () => setSaving(false) },
    );
  }

  // ── Loading / Error ──────────────────────────────────────────────

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

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="page-padded">
      {/* Toolbar */}
      <div className="page-toolbar">
        <h1>Orçamentos</h1>

        <input
          type="search"
          placeholder="Buscar por nº / cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar orçamentos"
          style={{ minWidth: 220 }}
        />

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          aria-label="Filtrar por status"
        >
          <option value="">Todos os status</option>
          <option value="rascunho">Rascunho</option>
          <option value="enviado">Enviado</option>
          <option value="aceito">Aceito</option>
          <option value="recusado">Recusado</option>
          <option value="expirado">Expirado</option>
        </select>

        <select
          value={filtroVendedor}
          onChange={(e) => setFiltroVendedor(e.target.value)}
          aria-label="Filtrar por vendedor"
        >
          <option value="">Todos os vendedores</option>
          {(reps ?? []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome}
            </option>
          ))}
        </select>

        <span className="page-count">
          {filtered.length} orçamentos
        </span>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KpiCard label="Total Orçado" value={formatBRL(totalOrcado)} color="var(--info)" />
        <KpiCard
          label="Qtd. Orçamentos"
          value={String(filtered.length)}
          color="var(--primary)"
        />
      </div>

      {/* Tabela */}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nº Orçamento</th>
              <th>Lead</th>
              <th>Cliente</th>
              <th style={{ textAlign: 'right' }}>Valor Total</th>
              <th>Status</th>
              <th>Data Envio</th>
              <th>Válido até</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const lead = leadsById.get(o.lead_id);
              const clienteNome = lead?.projeto ?? lead?.codigo ?? '—';
              const leadRef = lead?.codigo_legado ?? lead?.codigo ?? o.lead_id.slice(0, 8);

              return (
                <tr key={o.id}>
                  <td>
                    <strong>{o.numero}</strong>
                    <div className="cell-sub">v{o.versao}</div>
                  </td>
                  <td>
                    <span className="cell-sub" style={{ fontSize: '0.8rem' }}>
                      {leadRef}
                    </span>
                  </td>
                  <td>{clienteNome}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatBRL(o.valor_total)}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[o.status] ?? 'badge-muted'}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td>{formatDate(o.data_envio)}</td>
                  <td>{formatDate(o.validade_ate)}</td>
                  <td>
                    <button
                      className="btn-link"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius)',
                      }}
                      onClick={() => openModal(o)}
                    >
                      Detalhe
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
                  Nenhum orçamento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal detalhe */}
      {selected && edit && (
        <Dialog
          open={!!selected}
          onOpenChange={(open) => { if (!open) closeModal(); }}
          title={`Orçamento ${selected.numero} — v${selected.versao}`}
          description={`Lead: ${leadsById.get(selected.lead_id)?.codigo_legado ?? leadsById.get(selected.lead_id)?.codigo ?? selected.lead_id}`}
          width={680}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Status */}
            <FormRow label="Status">
              <select
                value={edit.status}
                onChange={(e) =>
                  setEdit((prev) => prev && { ...prev, status: e.target.value as OrcamentoStatus })
                }
                style={selectStyle}
              >
                {(['rascunho', 'enviado', 'aceito', 'recusado', 'expirado'] as OrcamentoStatus[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ),
                )}
              </select>
            </FormRow>

            {/* Projeto 2D */}
            <FormRow label="Projeto 2D">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="checkbox"
                  id="proj2d"
                  checked={edit.projeto_2d}
                  onChange={(e) =>
                    setEdit((prev) => prev && { ...prev, projeto_2d: e.target.checked })
                  }
                />
                <label htmlFor="proj2d" style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
                  Enviado
                </label>
                {edit.projeto_2d && (
                  <input
                    type="date"
                    value={edit.data_envio_2d}
                    onChange={(e) =>
                      setEdit((prev) => prev && { ...prev, data_envio_2d: e.target.value })
                    }
                    style={inputStyle}
                  />
                )}
              </div>
            </FormRow>

            {/* Projeto 3D */}
            <FormRow label="Projeto 3D">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="checkbox"
                  id="proj3d"
                  checked={edit.projeto_3d}
                  onChange={(e) =>
                    setEdit((prev) => prev && { ...prev, projeto_3d: e.target.checked })
                  }
                />
                <label htmlFor="proj3d" style={{ fontSize: '0.875rem', color: 'var(--text-2)' }}>
                  Enviado
                </label>
                {edit.projeto_3d && (
                  <input
                    type="date"
                    value={edit.data_envio_3d}
                    onChange={(e) =>
                      setEdit((prev) => prev && { ...prev, data_envio_3d: e.target.value })
                    }
                    style={inputStyle}
                  />
                )}
              </div>
            </FormRow>

            {/* Data envio proposta */}
            <FormRow label="Data Envio Proposta">
              <input
                type="date"
                value={edit.data_envio_proposta}
                onChange={(e) =>
                  setEdit((prev) => prev && { ...prev, data_envio_proposta: e.target.value })
                }
                style={inputStyle}
              />
            </FormRow>

            {/* Validade */}
            <FormRow label="Válido até">
              <input
                type="date"
                value={edit.validade_ate}
                onChange={(e) =>
                  setEdit((prev) => prev && { ...prev, validade_ate: e.target.value })
                }
                style={inputStyle}
              />
            </FormRow>

            {/* Valor total */}
            <FormRow label="Valor Total (R$)">
              <input
                type="number"
                min={0}
                step={0.01}
                value={edit.valor_total}
                onChange={(e) =>
                  setEdit((prev) => prev && { ...prev, valor_total: Number(e.target.value) })
                }
                style={inputStyle}
              />
            </FormRow>

            {/* Observações */}
            <FormRow label="Observações">
              <textarea
                value={edit.observacoes}
                rows={3}
                onChange={(e) =>
                  setEdit((prev) => prev && { ...prev, observacoes: e.target.value })
                }
                style={{ ...inputStyle, height: 'auto', resize: 'vertical' }}
              />
            </FormRow>

            {saveError && (
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: 0 }}>{saveError}</p>
            )}

            {/* Botão salvar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
              <button
                onClick={closeModal}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius)',
                  border: 'var(--border-w) solid var(--border)',
                  background: 'var(--surface-2)',
                  color: 'var(--text-1)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius)',
                  border: 'none',
                  background: saving ? 'var(--border)' : 'var(--primary)',
                  color: '#fff',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <article
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderTop: `3px solid ${color}`,
        borderRadius: 'var(--radius-lg)',
        padding: '14px 20px',
        minWidth: 180,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-1)' }}>{value}</div>
    </article>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'flex-start', gap: 12 }}>
      <label
        style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--text-2)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          paddingTop: 8,
        }}
      >
        {label}
      </label>
      <div>{children}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 10px',
  border: 'var(--border-w) solid var(--border)',
  borderRadius: 'var(--radius)',
  background: 'var(--surface)',
  color: 'var(--text-1)',
  fontSize: '0.875rem',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};
