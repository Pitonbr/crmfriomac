import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Dialog } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { useCliente } from '@/hooks/queries/useClientes';
import {
  useAddObservacao,
  useConcluirLead,
  useLead,
  useObservacoes,
} from '@/hooks/queries/useLeads';
import { formatBRL, formatDateTime, formatRelative } from '@/lib/formatters';
import type { Lead } from '@/api/schemas';

// Campos comerciais extras (backend migration 0007)
interface LeadFull extends Lead {
  data_ultimo_contato?: string | null;
  tipo_ultimo_contato?: string | null;
  projeto_2d_enviado?: boolean;
  projeto_2d_data?: string | null;
  projeto_3d_enviado?: boolean;
  projeto_3d_data?: string | null;
  probabilidade_override?: number | null;
  valor_entrada?: number | null;
  percentual_entrada?: number | null;
  forma_pagamento?: string | null;
}

export function LeadModal() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { data: lead, isPending } = useLead(leadId);
  const { data: cliente } = useCliente(lead?.cliente_id);
  const { data: observacoes } = useObservacoes(leadId);
  const addObs = useAddObservacao();
  const concluir = useConcluirLead();

  const [novaObs, setNovaObs] = useState('');
  const [motivoPerda, setMotivoPerda] = useState('');
  const [showPerdaInput, setShowPerdaInput] = useState(false);

  const close = () => navigate('/kanban', { replace: true });

  const handleAddObs = async () => {
    if (!leadId || !novaObs.trim()) return;
    try {
      await addObs.mutateAsync({ leadId, texto: novaObs.trim() });
      setNovaObs('');
      toast.success('Observação adicionada');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar');
    }
  };

  const handleGanho = async () => {
    if (!leadId) return;
    try {
      await concluir.mutateAsync({ leadId, resultado: 'ganho' });
      toast.success('Venda concluída! 🎉');
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao concluir');
    }
  };

  const handlePerdido = async () => {
    if (!leadId) return;
    if (!motivoPerda.trim()) {
      setShowPerdaInput(true);
      return;
    }
    try {
      await concluir.mutateAsync({
        leadId,
        resultado: 'perdido',
        motivo_perda: motivoPerda.trim(),
      });
      toast.warning('Lead marcado como perdido');
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao concluir');
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) close();
      }}
      title={lead ? `Lead #${lead.codigo}` : 'Carregando...'}
      description={cliente?.nome_fantasia ?? lead?.projeto ?? undefined}
      width={780}
    >
      {isPending || !lead ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spinner />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Resumo */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              padding: 16,
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius)',
            }}
          >
            <Field label="Cliente" value={cliente?.nome_fantasia ?? '—'} />
            <Field label="Valor" value={formatBRL(lead.valor)} />
            <Field
              label="Prioridade"
              value={lead.prioridade.charAt(0).toUpperCase() + lead.prioridade.slice(1)}
            />
            <Field label="Status" value={statusLabel(lead.status)} />
            <Field label="Aberto" value={formatRelative(lead.data_abertura)} />
            <Field label="Última movimentação" value={formatRelative(lead.data_ultima_movimentacao)} />
          </section>

          {/* Detalhes comerciais */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: 12,
              padding: 16,
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius)',
            }}
          >
            <Field
              label="Último Contato"
              value={
                (lead as LeadFull).data_ultimo_contato
                  ? `${formatDateTime((lead as LeadFull).data_ultimo_contato!)} · ${(lead as LeadFull).tipo_ultimo_contato ?? ''}`
                  : '—'
              }
            />
            <Field
              label="Forma de Pagamento"
              value={(lead as LeadFull).forma_pagamento ?? '—'}
            />
            <Field
              label="Valor de Entrada"
              value={
                (lead as LeadFull).valor_entrada != null
                  ? `${formatBRL((lead as LeadFull).valor_entrada!)} (${(lead as LeadFull).percentual_entrada ?? 0}%)`
                  : '—'
              }
            />
            <Field
              label="Projeto 2D"
              value={(lead as LeadFull).projeto_2d_enviado ? `Enviado${(lead as LeadFull).projeto_2d_data ? ` em ${formatDateTime((lead as LeadFull).projeto_2d_data!)}` : ''}` : 'Não enviado'}
            />
            <Field
              label="Projeto 3D"
              value={(lead as LeadFull).projeto_3d_enviado ? `Enviado${(lead as LeadFull).projeto_3d_data ? ` em ${formatDateTime((lead as LeadFull).projeto_3d_data!)}` : ''}` : 'Não enviado'}
            />
            <Field
              label="Probabilidade"
              value={
                (lead as LeadFull).probabilidade_override != null
                  ? `${(lead as LeadFull).probabilidade_override}% (manual)`
                  : 'Automática (stage)'
              }
            />
          </section>

          {/* Tags */}
          {lead.tags.length > 0 && (
            <section>
              <h4 style={{ fontSize: '.85rem', marginBottom: 6 }}>Tags</h4>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {lead.tags.map((t) => (
                  <span key={t} className="kb-card-tag">
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Ações de conclusão */}
          {lead.status === 'em_aberto' && (
            <section
              style={{
                display: 'flex',
                gap: 8,
                padding: 12,
                background: 'var(--surface-2)',
                borderRadius: 'var(--radius)',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <strong style={{ fontSize: '.85rem', flex: '1 1 auto' }}>
                Concluir negociação:
              </strong>
              <button
                type="button"
                onClick={() => void handleGanho()}
                disabled={concluir.isPending}
                style={{
                  padding: '6px 14px',
                  background: 'var(--success)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ✓ Ganho
              </button>
              <button
                type="button"
                onClick={() => void handlePerdido()}
                disabled={concluir.isPending}
                style={{
                  padding: '6px 14px',
                  background: 'var(--danger)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ✗ Perdido
              </button>
            </section>
          )}
          {showPerdaInput && (
            <input
              type="text"
              placeholder="Motivo da perda (obrigatório)"
              value={motivoPerda}
              onChange={(e) => setMotivoPerda(e.target.value)}
              maxLength={500}
              style={{
                padding: 8,
                border: 'var(--border-w) solid var(--border)',
                borderRadius: 'var(--radius)',
              }}
            />
          )}

          {/* Observações */}
          <section>
            <h4 style={{ fontSize: '.95rem', marginBottom: 12 }}>Histórico</h4>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Adicionar observação..."
                value={novaObs}
                onChange={(e) => setNovaObs(e.target.value)}
                style={{
                  flex: 1,
                  padding: 8,
                  border: 'var(--border-w) solid var(--border)',
                  borderRadius: 'var(--radius)',
                }}
              />
              <button
                type="button"
                onClick={() => void handleAddObs()}
                disabled={addObs.isPending || !novaObs.trim()}
                style={{
                  padding: '8px 16px',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Adicionar
              </button>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(observacoes ?? []).map((o) => (
                <li
                  key={o.id}
                  style={{
                    padding: 10,
                    background: 'var(--surface-2)',
                    borderRadius: 'var(--radius)',
                    borderLeft: `3px solid ${
                      o.tipo === 'sistema' ? 'var(--info)' : 'var(--accent)'
                    }`,
                  }}
                >
                  <div style={{ fontSize: '.7rem', color: 'var(--text-3)', marginBottom: 4 }}>
                    {o.autor_nome} · {formatDateTime(o.criado_em)} · {o.tipo}
                  </div>
                  <div style={{ fontSize: '.875rem', color: 'var(--text-1)' }}>{o.texto}</div>
                </li>
              ))}
              {(!observacoes || observacoes.length === 0) && (
                <li style={{ color: 'var(--text-3)', fontSize: '.85rem' }}>
                  Nenhuma observação ainda.
                </li>
              )}
            </ul>
          </section>
        </div>
      )}
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '.7rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: '.9rem', fontWeight: 600, color: 'var(--text-1)', marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function statusLabel(s: string): string {
  return (
    {
      em_aberto: 'Em aberto',
      ganho: 'Ganho',
      perdido: 'Perdido',
      em_producao: 'Em produção',
    }[s] ?? s
  );
}
