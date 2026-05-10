import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Dialog } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { useCliente, useUpdateCliente } from '@/hooks/queries/useClientes';
import { useLeads } from '@/hooks/queries/useLeads';
import { useStages } from '@/hooks/queries/useStages';
import { formatBRL, formatDate, formatRelative, formatTelefone } from '@/lib/formatters';
import type { Lead } from '@/api/schemas';

type Tab = 'dados' | 'leads';

const STATUS_LABEL: Record<string, string> = {
  em_aberto: 'Em aberto',
  ganho: '🏆 Ganho',
  perdido: '❌ Perdido',
  em_producao: 'Em produção',
};

const STATUS_COLOR: Record<string, string> = {
  em_aberto: 'var(--primary)',
  ganho: 'var(--success)',
  perdido: 'var(--danger)',
  em_producao: 'var(--info)',
};

export function ClientModal() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const navigate = useNavigate();

  const { data: cliente, isPending } = useCliente(clienteId);
  const { data: allLeads } = useLeads();
  const { data: stages } = useStages();
  const updateCliente = useUpdateCliente();

  const [tab, setTab] = useState<Tab>('dados');

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editContato, setEditContato] = useState('');
  const [editTel, setEditTel] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCidade, setEditCidade] = useState('');
  const [editEstado, setEditEstado] = useState('');
  const [editCnpj, setEditCnpj] = useState('');
  const [editSegmento, setEditSegmento] = useState('');
  const [editObs, setEditObs] = useState('');

  const close = () => navigate('/clientes', { replace: true });

  const clienteLeads: Lead[] = (allLeads ?? []).filter(
    (l) => l.cliente_id === clienteId,
  ).sort((a, b) => new Date(b.data_abertura).getTime() - new Date(a.data_abertura).getTime());

  const stagesMap = new Map((stages ?? []).map((s) => [s.id, s]));

  const startEdit = () => {
    if (!cliente) return;
    setEditNome(cliente.nome_fantasia);
    setEditContato(cliente.nome_contato ?? '');
    setEditTel(cliente.telefone ?? '');
    setEditEmail(cliente.email ?? '');
    setEditCidade(cliente.cidade ?? '');
    setEditEstado(cliente.estado ?? '');
    setEditCnpj(cliente.cnpj ?? '');
    setEditSegmento(cliente.segmento ?? '');
    setEditObs(cliente.observacoes ?? '');
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!clienteId) return;
    try {
      await updateCliente.mutateAsync({
        id: clienteId,
        payload: {
          nome_fantasia: editNome || undefined,
          nome_contato: editContato || null,
          telefone: editTel || null,
          email: editEmail || null,
          cidade: editCidade || null,
          estado: editEstado || null,
          cnpj: editCnpj || null,
          segmento: editSegmento || null,
        },
      });
      toast.success('Cliente atualizado');
      setEditMode(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar');
    }
  };

  const openLead = (leadId: string) => {
    navigate(`/kanban/leads/${leadId}`);
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => { if (!o) close(); }}
      title={cliente ? cliente.nome_fantasia : 'Carregando...'}
      description={cliente?.nome_contato ?? cliente?.cidade ?? undefined}
      width={820}
    >
      {isPending || !cliente ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spinner />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="lm-tabs">
            <button
              type="button"
              className={`lm-tab${tab === 'dados' ? ' active' : ''}`}
              onClick={() => setTab('dados')}
            >
              Dados do Cliente
            </button>
            <button
              type="button"
              className={`lm-tab${tab === 'leads' ? ' active' : ''}`}
              onClick={() => setTab('leads')}
            >
              Leads ({clienteLeads.length})
            </button>
          </div>

          {/* ── Tab: Dados ── */}
          {tab === 'dados' && (
            <div className="lm-tab-body">
              <div>
                <div className="lm-section-title" style={{ justifyContent: 'space-between' }}>
                  <span>Informações</span>
                  {!editMode && (
                    <button
                      type="button"
                      style={{ fontSize: '.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, marginLeft: 'auto' }}
                      onClick={startEdit}
                    >
                      ✎ Editar
                    </button>
                  )}
                </div>

                {editMode ? (
                  <div className="lm-field-grid">
                    <div className="lm-field wide">
                      <span className="lm-field-label">Nome Fantasia *</span>
                      <input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                    </div>
                    <div className="lm-field">
                      <span className="lm-field-label">Contato</span>
                      <input value={editContato} onChange={(e) => setEditContato(e.target.value)} />
                    </div>
                    <div className="lm-field">
                      <span className="lm-field-label">Telefone</span>
                      <input value={editTel} onChange={(e) => setEditTel(e.target.value)} />
                    </div>
                    <div className="lm-field">
                      <span className="lm-field-label">E-mail</span>
                      <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                    </div>
                    <div className="lm-field">
                      <span className="lm-field-label">Cidade</span>
                      <input value={editCidade} onChange={(e) => setEditCidade(e.target.value)} />
                    </div>
                    <div className="lm-field">
                      <span className="lm-field-label">UF</span>
                      <input value={editEstado} onChange={(e) => setEditEstado(e.target.value)} maxLength={2} />
                    </div>
                    <div className="lm-field">
                      <span className="lm-field-label">CNPJ</span>
                      <input value={editCnpj} onChange={(e) => setEditCnpj(e.target.value)} />
                    </div>
                    <div className="lm-field">
                      <span className="lm-field-label">Segmento</span>
                      <input value={editSegmento} onChange={(e) => setEditSegmento(e.target.value)} />
                    </div>
                    <div className="lm-field wide">
                      <span className="lm-field-label">Observações Internas</span>
                      <textarea
                        rows={3}
                        value={editObs}
                        onChange={(e) => setEditObs(e.target.value)}
                      />
                    </div>
                    <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="lm-save-btn"
                        disabled={updateCliente.isPending}
                        onClick={() => void handleSave()}
                      >
                        {updateCliente.isPending ? 'Salvando...' : '✓ Salvar'}
                      </button>
                      <button
                        type="button"
                        style={{ padding: '7px 14px', background: 'var(--surface-2)', border: 'var(--border-w) solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '.85rem' }}
                        onClick={() => setEditMode(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="lm-field-grid">
                    <LmField label="Nome Fantasia" value={cliente.nome_fantasia} />
                    {cliente.razao_social && <LmField label="Razão Social" value={cliente.razao_social} />}
                    {cliente.cnpj && <LmField label="CNPJ" value={cliente.cnpj} />}
                    <LmField label="Contato" value={cliente.nome_contato ?? '—'} />
                    <LmField label="Telefone" value={cliente.telefone ? formatTelefone(cliente.telefone) : '—'} />
                    <LmField label="E-mail" value={cliente.email ?? '—'} />
                    <LmField label="Cidade" value={cliente.cidade ? `${cliente.cidade}${cliente.estado ? `/${cliente.estado}` : ''}` : '—'} />
                    {cliente.segmento && <LmField label="Segmento" value={cliente.segmento} />}
                    {cliente.canal && <LmField label="Canal" value={cliente.canal} />}
                    {cliente.criado_em && <LmField label="Cadastro" value={formatDate(cliente.criado_em)} />}
                    {cliente.observacoes && (
                      <div className="lm-field" style={{ gridColumn: '1/-1' }}>
                        <span className="lm-field-label">Observações</span>
                        <span className="lm-field-value" style={{ whiteSpace: 'pre-wrap' }}>{cliente.observacoes}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Summary stats */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <StatBox
                  label="Leads Totais"
                  value={String(clienteLeads.length)}
                />
                <StatBox
                  label="Em Aberto"
                  value={String(clienteLeads.filter((l) => l.status === 'em_aberto').length)}
                />
                <StatBox
                  label="Ganhos"
                  value={String(clienteLeads.filter((l) => l.status === 'ganho').length)}
                  color="var(--success)"
                />
                <StatBox
                  label="Pipeline Total"
                  value={formatBRL(
                    clienteLeads
                      .filter((l) => l.status === 'em_aberto')
                      .reduce((s, l) => s + l.valor, 0),
                  )}
                  color="var(--primary)"
                />
                <StatBox
                  label="Valor Ganho"
                  value={formatBRL(
                    clienteLeads
                      .filter((l) => l.status === 'ganho')
                      .reduce((s, l) => s + l.valor, 0),
                  )}
                  color="var(--success)"
                />
              </div>
            </div>
          )}

          {/* ── Tab: Leads ── */}
          {tab === 'leads' && (
            <div className="lm-tab-body">
              {clienteLeads.length === 0 ? (
                <p style={{ color: 'var(--text-3)', fontSize: '.875rem', textAlign: 'center', padding: 24 }}>
                  Nenhum lead associado a este cliente.
                </p>
              ) : (
                <div className="cli-leads-list">
                  {clienteLeads.map((lead) => {
                    const stage = stagesMap.get(lead.stage_id);
                    return (
                      <button
                        key={lead.id}
                        type="button"
                        className="cli-lead-row"
                        onClick={() => openLead(lead.id)}
                        title="Abrir detalhes do lead"
                      >
                        <div className="cli-lead-codigo">#{lead.codigo}</div>

                        <div className="cli-lead-info">
                          <div className="cli-lead-projeto">
                            {lead.projeto ?? '—'}
                          </div>
                          <div className="cli-lead-date">
                            Aberto {formatRelative(lead.data_abertura)}
                            {lead.data_ultima_movimentacao !== lead.data_abertura && (
                              <> · Mov. {formatRelative(lead.data_ultima_movimentacao)}</>
                            )}
                          </div>
                        </div>

                        {stage && (
                          <span
                            className="cli-lead-stage"
                            style={{ borderColor: stage.cor, color: stage.cor }}
                          >
                            {stage.icone ? `${stage.icone} ` : ''}{stage.label}
                          </span>
                        )}

                        <div className="cli-lead-valor">{formatBRL(lead.valor)}</div>

                        <span
                          className="cli-lead-status"
                          style={{ color: STATUS_COLOR[lead.status] ?? 'var(--text-2)' }}
                        >
                          {STATUS_LABEL[lead.status] ?? lead.status}
                        </span>

                        <span className="cli-lead-arrow">→</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}

function LmField({ label, value }: { label: string; value: string }) {
  return (
    <div className="lm-field">
      <span className="lm-field-label">{label}</span>
      <span className="lm-field-value">{value}</span>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      padding: '10px 16px',
      background: 'var(--surface-2)',
      borderRadius: 'var(--radius)',
      border: 'var(--border-w) solid var(--border)',
      minWidth: 100,
    }}>
      <div style={{ fontSize: '.68rem', color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: '1rem', fontWeight: 800, color: color ?? 'var(--text-1)', marginTop: 2 }}>{value}</div>
    </div>
  );
}
