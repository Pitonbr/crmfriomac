import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useComissoes } from '@/hooks/queries/useOrcamentos';
import { useRepresentantes } from '@/hooks/queries/useRepresentantes';
import { useLeads } from '@/hooks/queries/useLeads';
import { Spinner } from '@/components/ui/Spinner';
import { Dialog } from '@/components/ui/Dialog';
import { http } from '@/lib/http';
import { formatBRL, formatDate, formatNumber } from '@/lib/formatters';
import type { Comissao } from '@/api/schemas';

import '@/features/clientes/clientes.css';

const STATUS_BADGE: Record<string, string> = {
  pendente: 'badge-warning',
  aprovada: 'badge-info',
  paga: 'badge-success',
  cancelada: 'badge-muted',
};

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  paga: 'Paga',
  cancelada: 'Cancelada',
};

type Periodo = 'tudo' | '30dias' | '12meses';

interface ModalState {
  comissao: Comissao;
  dataPagamento: string;
  observacao: string;
  arquivo: File | null;
}

async function pagarComissao(id: string, formData: FormData) {
  return http('/api/v1/comissoes/' + id + '/pagar', { method: 'PATCH', body: formData });
}

function filtrarPorPeriodo(comissoes: Comissao[], periodo: Periodo): Comissao[] {
  if (periodo === 'tudo') return comissoes;
  const agora = new Date();
  const limite = new Date(agora);
  if (periodo === '30dias') {
    limite.setDate(agora.getDate() - 30);
  } else {
    limite.setFullYear(agora.getFullYear() - 1);
  }
  return comissoes.filter((c) => new Date(c.criado_em) >= limite);
}

export function ComissoesPage() {
  const [repFiltro, setRepFiltro] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>('tudo');
  const [modal, setModal] = useState<ModalState | null>(null);

  const { data: comissoes, isPending, isError } = useComissoes();
  const { data: reps } = useRepresentantes();
  const { data: leads } = useLeads();
  const queryClient = useQueryClient();

  const repsById = new Map((reps ?? []).map((r) => [r.id, r]));
  const leadsById = new Map((leads ?? []).map((l) => [l.id, l]));

  const pagarMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      pagarComissao(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes'] });
      setModal(null);
    },
  });

  if (isPending) {
    return (
      <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}>
        <Spinner label="Carregando comissões..." />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="empty-state" style={{ padding: 40 }}>
        <p style={{ color: 'var(--danger)' }}>Erro ao carregar comissões.</p>
      </div>
    );
  }

  const todas = comissoes ?? [];
  const filtradas = filtrarPorPeriodo(
    repFiltro ? todas.filter((c) => c.representante_id === repFiltro) : todas,
    periodo,
  );

  const totalGeral = filtradas.reduce((acc, c) => acc + Number(c.valor_comissao), 0);
  const pendentes = filtradas.filter((c) => c.status === 'pendente' || c.status === 'aprovada');
  const pagas = filtradas.filter((c) => c.status === 'paga');
  const totalPendente = pendentes.reduce((acc, c) => acc + Number(c.valor_comissao), 0);
  const totalPago = pagas.reduce((acc, c) => acc + Number(c.valor_comissao), 0);

  function abrirModal(c: Comissao) {
    const hoje = new Date().toISOString().split('T')[0] ?? '';
    setModal({ comissao: c, dataPagamento: hoje, observacao: '', arquivo: null });
  }

  function fecharModal() {
    setModal(null);
  }

  function confirmarPagamento() {
    if (!modal || !modal.arquivo) return;
    const fd = new FormData();
    fd.append('data_pagamento', modal.dataPagamento);
    fd.append('observacao', modal.observacao);
    fd.append('comprovante', modal.arquivo);
    pagarMutation.mutate({ id: modal.comissao.id, formData: fd });
  }

  function nomeLead(leadId: string): string {
    const lead = leadsById.get(leadId);
    if (!lead) return leadId.slice(0, 8) + '…';
    return lead.codigo;
  }

  function nomeCliente(leadId: string): string {
    const lead = leadsById.get(leadId);
    if (!lead) return '—';
    const cliente = lead.projeto ?? lead.codigo;
    return cliente;
  }

  return (
    <div className="page-padded">
      <div className="page-toolbar">
        <h1>Comissões</h1>
        <select
          value={repFiltro}
          onChange={(e) => setRepFiltro(e.target.value)}
          aria-label="Filtrar por representante"
        >
          <option value="">Todos os representantes</option>
          {(reps ?? []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome}
            </option>
          ))}
        </select>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as Periodo)}
          aria-label="Filtrar por período"
        >
          <option value="tudo">Todos os períodos</option>
          <option value="30dias">Últimos 30 dias</option>
          <option value="12meses">Últimos 12 meses</option>
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
        }}
      >
        <KpiCard
          label="Total em Comissões"
          value={formatBRL(totalGeral)}
          color="var(--primary)"
          subtitle={`${filtradas.length} registros`}
        />
        <KpiCard
          label="Pendentes"
          value={formatBRL(totalPendente)}
          color="var(--warning)"
          subtitle={`${pendentes.length} comissão(ões)`}
        />
        <KpiCard
          label="Total Pago"
          value={formatBRL(totalPago)}
          color="var(--success)"
          subtitle={`${pagas.length} comissão(ões)`}
        />
      </div>

      <section>
        <h2
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--text-3)',
            marginBottom: 8,
          }}
        >
          Pendentes ({pendentes.length})
        </h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nº Lead</th>
                <th>Cliente / Projeto</th>
                <th>Representante</th>
                <th style={{ textAlign: 'right' }}>Valor Base</th>
                <th style={{ textAlign: 'right' }}>% Comissão</th>
                <th style={{ textAlign: 'right' }}>Valor Comissão</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {pendentes.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{nomeLead(c.lead_id)}</strong>
                  </td>
                  <td>{nomeCliente(c.lead_id)}</td>
                  <td>{repsById.get(c.representante_id)?.nome ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>{formatBRL(c.valor_base)}</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(c.percentual, 2)}%</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--warning)' }}>
                    {formatBRL(c.valor_comissao)}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[c.status] ?? 'badge-muted'}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => abrirModal(c)}
                      style={{
                        padding: '4px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: 'var(--success)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Marcar Pago
                    </button>
                  </td>
                </tr>
              ))}
              {pendentes.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}
                  >
                    Nenhuma comissão pendente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--text-3)',
            marginBottom: 8,
          }}
        >
          Pagas ({pagas.length})
        </h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nº Lead</th>
                <th>Cliente / Projeto</th>
                <th>Representante</th>
                <th style={{ textAlign: 'right' }}>Valor Base</th>
                <th style={{ textAlign: 'right' }}>% Comissão</th>
                <th style={{ textAlign: 'right' }}>Valor Comissão</th>
                <th>Status</th>
                <th>Data Pgto</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {pagas.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{nomeLead(c.lead_id)}</strong>
                  </td>
                  <td>{nomeCliente(c.lead_id)}</td>
                  <td>{repsById.get(c.representante_id)?.nome ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>{formatBRL(c.valor_base)}</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(c.percentual, 2)}%</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                    {formatBRL(c.valor_comissao)}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[c.status] ?? 'badge-muted'}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td>{formatDate(c.data_pagamento)}</td>
                  <td>
                    <a
                      href={`/leads/${c.lead_id}`}
                      style={{
                        padding: '4px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: 'var(--surface-2)',
                        color: 'var(--primary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        textDecoration: 'none',
                        display: 'inline-block',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Ver Lead
                    </a>
                  </td>
                </tr>
              ))}
              {pagas.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}
                  >
                    Nenhuma comissão paga ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal && (
        <Dialog
          open={true}
          onOpenChange={(open) => { if (!open) fecharModal(); }}
          title="Registrar Pagamento"
          description={`Comissão de ${repsById.get(modal.comissao.representante_id)?.nome ?? '—'} · ${formatBRL(modal.comissao.valor_comissao)}`}
          width={520}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label
                htmlFor="modal-data-pgto"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-2)' }}
              >
                Data de pagamento *
              </label>
              <input
                id="modal-data-pgto"
                type="date"
                value={modal.dataPagamento}
                onChange={(e) => setModal((m) => m ? { ...m, dataPagamento: e.target.value } : m)}
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 12px',
                  border: 'var(--border-w) solid var(--border)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--surface)',
                  color: 'var(--text-1)',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="modal-obs"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-2)' }}
              >
                Observação
              </label>
              <textarea
                id="modal-obs"
                value={modal.observacao}
                onChange={(e) => setModal((m) => m ? { ...m, observacao: e.target.value } : m)}
                rows={3}
                placeholder="Informações adicionais sobre o pagamento..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'var(--border-w) solid var(--border)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--surface)',
                  color: 'var(--text-1)',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="modal-comprovante"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-2)' }}
              >
                Comprovante *
              </label>
              <input
                id="modal-comprovante"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) =>
                  setModal((m) => m ? { ...m, arquivo: e.target.files?.[0] ?? null } : m)
                }
                style={{
                  width: '100%',
                  fontSize: '0.875rem',
                  color: 'var(--text-1)',
                }}
              />
              {!modal.arquivo && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 4 }}>
                  Selecione um arquivo para habilitar o botão de confirmar.
                </p>
              )}
              {modal.arquivo && (
                <p style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: 4 }}>
                  {modal.arquivo.name}
                </p>
              )}
            </div>

            {pagarMutation.isError && (
              <p style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>
                Erro ao registrar pagamento. Tente novamente.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                onClick={fecharModal}
                disabled={pagarMutation.isPending}
                style={{
                  padding: '8px 20px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  background: 'var(--surface-2)',
                  color: 'var(--text-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarPagamento}
                disabled={!modal.arquivo || pagarMutation.isPending}
                style={{
                  padding: '8px 20px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  background: modal.arquivo ? 'var(--success)' : 'var(--border)',
                  color: modal.arquivo ? '#fff' : 'var(--text-3)',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  cursor: modal.arquivo ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {pagarMutation.isPending && <Spinner size={14} />}
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </Dialog>
      )}
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
    <article
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderTop: `3px solid ${color}`,
        borderRadius: 'var(--radius-lg)',
        padding: '16px 18px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--text-3)',
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '1.4rem',
          fontWeight: 800,
          color: 'var(--text-1)',
          marginTop: 8,
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: 4 }}>{subtitle}</div>
      )}
    </article>
  );
}
