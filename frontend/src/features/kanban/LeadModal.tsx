import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Dialog } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { getAnexoDownloadUrl } from '@/api/leads';
import type { Lead } from '@/api/schemas';
import { useCliente, useUpdateCliente } from '@/hooks/queries/useClientes';
import {
  useAddObservacao,
  useAnexos,
  useLead,
  useObservacoes,
  useUpdateLead,
  useUploadAnexo,
} from '@/hooks/queries/useLeads';
import { useStages } from '@/hooks/queries/useStages';
import { formatBRL, formatDate, formatDateTime, formatRelative } from '@/lib/formatters';
import { fileIconForContentType } from './utils';
import { OutcomeDialog } from './OutcomeDialog';

type Tab = 'info' | 'obs' | 'anexos';

export function LeadModal() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();

  const { data: lead, isPending } = useLead(leadId);
  const { data: cliente } = useCliente(lead?.cliente_id);
  const { data: observacoes } = useObservacoes(leadId);
  const { data: anexos } = useAnexos(leadId);
  const { data: stages } = useStages();

  const addObs = useAddObservacao();
  const updateLead = useUpdateLead();
  const updateCliente = useUpdateCliente();
  const uploadAnexo = useUploadAnexo();

  const [tab, setTab] = useState<Tab>('info');
  const [showOutcome, setShowOutcome] = useState(false);
  const [outcomeTab, setOutcomeTab] = useState<'ganho' | 'perdido'>('ganho');

  // Client edit state
  const [editClientMode, setEditClientMode] = useState(false);
  const [editCliNome, setEditCliNome] = useState('');
  const [editCliContato, setEditCliContato] = useState('');
  const [editCliTel, setEditCliTel] = useState('');
  const [editCliEmail, setEditCliEmail] = useState('');
  const [editCliCidade, setEditCliCidade] = useState('');
  const [editCliEstado, setEditCliEstado] = useState('');
  const [editCliCnpj, setEditCliCnpj] = useState('');

  // Obs state
  const [novaObs, setNovaObs] = useState('');

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [editValor, setEditValor] = useState('');
  const [editProjeto, setEditProjeto] = useState('');
  const [editPrio, setEditPrio] = useState<'baixa' | 'media' | 'alta'>('media');
  const [editFormaPgto, setEditFormaPgto] = useState('');
  const [editValorEntrada, setEditValorEntrada] = useState('');
  const [editPctEntrada, setEditPctEntrada] = useState('');
  const [editProb2d, setEditProb2d] = useState(false);
  const [editProb3d, setEditProb3d] = useState(false);
  const [editProbOverride, setEditProbOverride] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const close = () => navigate('/kanban', { replace: true });

  const startEdit = (l: Lead) => {
    setEditValor(String(l.valor));
    setEditProjeto(l.projeto ?? '');
    setEditPrio(l.prioridade);
    setEditFormaPgto(l.forma_pagamento ?? '');
    setEditValorEntrada(l.valor_entrada != null ? String(l.valor_entrada) : '');
    setEditPctEntrada(l.percentual_entrada != null ? String(l.percentual_entrada) : '');
    setEditProb2d(l.projeto_2d_enviado ?? false);
    setEditProb3d(l.projeto_3d_enviado ?? false);
    setEditProbOverride(l.probabilidade_override != null ? String(l.probabilidade_override) : '');
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!leadId) return;
    try {
      await updateLead.mutateAsync({
        leadId,
        payload: {
          valor: parseFloat(editValor.replace(/[^\d.]/, '')) || undefined,
          projeto: editProjeto || undefined,
          prioridade: editPrio,
          forma_pagamento: editFormaPgto || null,
          valor_entrada: editValorEntrada ? parseFloat(editValorEntrada) : null,
          percentual_entrada: editPctEntrada ? parseFloat(editPctEntrada) : null,
          projeto_2d_enviado: editProb2d,
          projeto_3d_enviado: editProb3d,
          probabilidade_override: editProbOverride ? parseFloat(editProbOverride) : null,
        },
      });
      toast.success('Lead atualizado');
      setEditMode(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar');
    }
  };

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

  const handleUpload = async (file: File) => {
    if (!leadId) return;
    try {
      await uploadAnexo.mutateAsync({ leadId, file });
      toast.success('Arquivo enviado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro no upload');
    }
  };

  const handleDownload = async (anexoId: string, nome: string) => {
    try {
      const url = `${getAnexoDownloadUrl(anexoId)}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Download falhou');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro no download');
    }
  };

  const startClientEdit = () => {
    if (!cliente) return;
    setEditCliNome(cliente.nome_fantasia);
    setEditCliContato(cliente.nome_contato ?? '');
    setEditCliTel(cliente.telefone ?? '');
    setEditCliEmail(cliente.email ?? '');
    setEditCliCidade(cliente.cidade ?? '');
    setEditCliEstado(cliente.estado ?? '');
    setEditCliCnpj(cliente.cnpj ?? '');
    setEditClientMode(true);
  };

  const handleSaveCliente = async () => {
    if (!cliente) return;
    try {
      await updateCliente.mutateAsync({
        id: cliente.id,
        payload: {
          nome_fantasia: editCliNome || undefined,
          nome_contato: editCliContato || null,
          telefone: editCliTel || null,
          email: editCliEmail || null,
          cidade: editCliCidade || null,
          estado: editCliEstado || null,
          cnpj: editCliCnpj || null,
        },
      });
      toast.success('Cliente atualizado');
      setEditClientMode(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar');
    }
  };

  const stagesSorted = (stages ?? []).filter((s) => s.ativo).sort((a, b) => a.ordem - b.ordem);

  const currentStageOrdem = lead
    ? (stagesSorted.find((s) => s.id === lead.stage_id)?.ordem ?? 0)
    : 0;

  return (
    <>
      <Dialog
        open
        onOpenChange={(o) => { if (!o) close(); }}
        title={lead ? `Lead #${lead.codigo}` : 'Carregando...'}
        description={cliente?.nome_fantasia ?? lead?.projeto ?? undefined}
        width={820}
      >
        {isPending || !lead ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spinner />
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="lm-tabs">
              <button
                type="button"
                className={`lm-tab${tab === 'info' ? ' active' : ''}`}
                onClick={() => setTab('info')}
              >
                Informações
              </button>
              <button
                type="button"
                className={`lm-tab${tab === 'obs' ? ' active' : ''}`}
                onClick={() => setTab('obs')}
              >
                Observações ({(observacoes ?? []).length})
              </button>
              <button
                type="button"
                className={`lm-tab${tab === 'anexos' ? ' active' : ''}`}
                onClick={() => setTab('anexos')}
              >
                Anexos ({(anexos ?? []).length})
              </button>
            </div>

            {/* ── Tab: Informações ── */}
            {tab === 'info' && (
              <div className="lm-tab-body">
                {/* Stage timeline */}
                <div>
                  <div className="lm-section-title">Etapa no Funil</div>
                  <div className="lm-timeline">
                    {stagesSorted.map((s) => {
                      const isDone = s.ordem < currentStageOrdem;
                      const isCurrent = s.id === lead.stage_id;
                      return (
                        <div
                          key={s.id}
                          className={`lm-timeline-step${isDone ? ' done' : ''}${isCurrent ? ' current' : ''}`}
                        >
                          <div className="lm-timeline-dot">
                            {isDone ? '✓' : s.icone ?? s.ordem}
                          </div>
                          <span className="lm-timeline-label">{s.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cliente info */}
                {cliente && (
                  <div>
                    <div className="lm-section-title" style={{ justifyContent: 'space-between' }}>
                      <span>Cliente</span>
                      {!editClientMode && (
                        <button
                          type="button"
                          style={{ fontSize: '.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, marginLeft: 'auto' }}
                          onClick={startClientEdit}
                        >
                          ✎ Editar
                        </button>
                      )}
                    </div>

                    {editClientMode ? (
                      <div className="lm-field-grid">
                        <div className="lm-field wide">
                          <span className="lm-field-label">Nome Fantasia *</span>
                          <input value={editCliNome} onChange={(e) => setEditCliNome(e.target.value)} />
                        </div>
                        <div className="lm-field">
                          <span className="lm-field-label">Contato</span>
                          <input value={editCliContato} onChange={(e) => setEditCliContato(e.target.value)} />
                        </div>
                        <div className="lm-field">
                          <span className="lm-field-label">Telefone</span>
                          <input value={editCliTel} onChange={(e) => setEditCliTel(e.target.value)} />
                        </div>
                        <div className="lm-field">
                          <span className="lm-field-label">E-mail</span>
                          <input type="email" value={editCliEmail} onChange={(e) => setEditCliEmail(e.target.value)} />
                        </div>
                        <div className="lm-field">
                          <span className="lm-field-label">Cidade</span>
                          <input value={editCliCidade} onChange={(e) => setEditCliCidade(e.target.value)} />
                        </div>
                        <div className="lm-field">
                          <span className="lm-field-label">UF</span>
                          <input value={editCliEstado} onChange={(e) => setEditCliEstado(e.target.value)} maxLength={2} />
                        </div>
                        <div className="lm-field">
                          <span className="lm-field-label">CNPJ</span>
                          <input value={editCliCnpj} onChange={(e) => setEditCliCnpj(e.target.value)} />
                        </div>
                        <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            className="lm-save-btn"
                            disabled={updateCliente.isPending}
                            onClick={() => void handleSaveCliente()}
                          >
                            {updateCliente.isPending ? 'Salvando...' : '✓ Salvar'}
                          </button>
                          <button
                            type="button"
                            style={{ padding: '7px 14px', background: 'var(--surface-2)', border: 'var(--border-w) solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '.85rem' }}
                            onClick={() => setEditClientMode(false)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="lm-field-grid">
                        <LmField label="Nome Fantasia" value={cliente.nome_fantasia} />
                        {cliente.nome_contato && <LmField label="Contato" value={cliente.nome_contato} />}
                        {cliente.telefone && <LmField label="Telefone" value={cliente.telefone} />}
                        {cliente.email && <LmField label="E-mail" value={cliente.email} />}
                        {cliente.cidade && <LmField label="Cidade" value={`${cliente.cidade}${cliente.estado ? `/${cliente.estado}` : ''}`} />}
                        {cliente.cnpj && <LmField label="CNPJ" value={cliente.cnpj} />}
                      </div>
                    )}
                  </div>
                )}

                {/* Lead fields */}
                <div>
                  <div className="lm-section-title" style={{ justifyContent: 'space-between' }}>
                    <span>Dados do Lead</span>
                    {lead.status === 'em_aberto' && !editMode && (
                      <button
                        type="button"
                        style={{
                          fontSize: '.75rem',
                          color: 'var(--primary)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 700,
                          marginLeft: 'auto',
                        }}
                        onClick={() => startEdit(lead)}
                      >
                        ✎ Editar
                      </button>
                    )}
                  </div>

                  {editMode ? (
                    <div className="lm-field-grid">
                      <div className="lm-field">
                        <span className="lm-field-label">Projeto</span>
                        <input value={editProjeto} onChange={(e) => setEditProjeto(e.target.value)} />
                      </div>
                      <div className="lm-field">
                        <span className="lm-field-label">Valor (R$)</span>
                        <input value={editValor} onChange={(e) => setEditValor(e.target.value)} />
                      </div>
                      <div className="lm-field">
                        <span className="lm-field-label">Prioridade</span>
                        <select value={editPrio} onChange={(e) => setEditPrio(e.target.value as 'baixa' | 'media' | 'alta')}>
                          <option value="baixa">Baixa</option>
                          <option value="media">Média</option>
                          <option value="alta">Alta</option>
                        </select>
                      </div>
                      <div className="lm-field">
                        <span className="lm-field-label">Forma de Pagamento</span>
                        <select value={editFormaPgto} onChange={(e) => setEditFormaPgto(e.target.value)}>
                          <option value="">Não definido</option>
                          <option>À vista</option>
                          <option>Boleto</option>
                          <option>Parcelado</option>
                          <option>Financiamento</option>
                          <option>Outro</option>
                        </select>
                      </div>
                      <div className="lm-field">
                        <span className="lm-field-label">Valor de Entrada (R$)</span>
                        <input value={editValorEntrada} onChange={(e) => setEditValorEntrada(e.target.value)} placeholder="Opcional" />
                      </div>
                      <div className="lm-field">
                        <span className="lm-field-label">% Entrada</span>
                        <input value={editPctEntrada} onChange={(e) => setEditPctEntrada(e.target.value)} placeholder="0-100" />
                      </div>
                      <div className="lm-field">
                        <span className="lm-field-label">Ajuste Manual Prob. (%)</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={editProbOverride}
                          onChange={(e) => setEditProbOverride(e.target.value)}
                          placeholder="Ex: 10 (adicional)"
                        />
                      </div>
                      <div className="lm-field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.85rem', cursor: 'pointer' }}>
                          <input type="checkbox" checked={editProb2d} onChange={(e) => setEditProb2d(e.target.checked)} />
                          Projeto 2D enviado
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.85rem', cursor: 'pointer' }}>
                          <input type="checkbox" checked={editProb3d} onChange={(e) => setEditProb3d(e.target.checked)} />
                          Projeto 3D enviado
                        </label>
                      </div>
                      <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, marginTop: 4 }}>
                        <button
                          type="button"
                          className="lm-save-btn"
                          disabled={updateLead.isPending}
                          onClick={() => void handleSave()}
                        >
                          {updateLead.isPending ? 'Salvando...' : '✓ Salvar'}
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
                      <LmField label="Projeto" value={lead.projeto ?? '—'} />
                      <LmField label="Valor" value={formatBRL(lead.valor)} />
                      <LmField label="Prioridade" value={lead.prioridade === 'alta' ? 'Alta' : lead.prioridade === 'media' ? 'Média' : 'Baixa'} />
                      <LmField label="Status" value={statusLabel(lead.status)} />
                      <LmField label="Forma de Pagamento" value={lead.forma_pagamento ?? '—'} />
                      {lead.valor_entrada != null && (
                        <LmField
                          label="Entrada"
                          value={`${formatBRL(lead.valor_entrada)}${lead.percentual_entrada ? ` (${lead.percentual_entrada}%)` : ''}`}
                        />
                      )}
                      <LmField label="Projeto 2D" value={lead.projeto_2d_enviado ? `Enviado${lead.projeto_2d_data ? ` em ${formatDate(lead.projeto_2d_data)}` : ''}` : 'Não'} />
                      <LmField label="Projeto 3D" value={lead.projeto_3d_enviado ? `Enviado${lead.projeto_3d_data ? ` em ${formatDate(lead.projeto_3d_data)}` : ''}` : 'Não'} />
                      {lead.probabilidade_override != null && (
                        <LmField label="Ajuste Manual" value={`+${lead.probabilidade_override}%`} />
                      )}
                      <LmField label="Aberto" value={formatRelative(lead.data_abertura)} />
                      <LmField label="Última Mov." value={formatRelative(lead.data_ultima_movimentacao)} />
                      {lead.data_ultimo_contato && (
                        <LmField label="Último Contato" value={`${formatDateTime(lead.data_ultimo_contato)}${lead.tipo_ultimo_contato ? ` · ${lead.tipo_ultimo_contato}` : ''}`} />
                      )}
                      {lead.motivo_perda && (
                        <LmField label="Motivo Perda" value={lead.motivo_perda} />
                      )}
                    </div>
                  )}
                </div>

                {/* Tags */}
                {lead.tags.length > 0 && (
                  <div>
                    <div className="lm-section-title">Tags</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {lead.tags.map((t) => (
                        <span key={t} className="kb-card-tag">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outcome actions */}
                {lead.status === 'em_aberto' && (
                  <div className="lm-outcome-bar">
                    <strong>Decisão Final:</strong>
                    <button
                      type="button"
                      className="lm-btn-ganho"
                      onClick={() => { setOutcomeTab('ganho'); setShowOutcome(true); }}
                    >
                      🏆 Ganho
                    </button>
                    <button
                      type="button"
                      className="lm-btn-perdido"
                      onClick={() => { setOutcomeTab('perdido'); setShowOutcome(true); }}
                    >
                      ✗ Perdido
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Observações ── */}
            {tab === 'obs' && (
              <div className="lm-tab-body">
                {lead.status === 'em_aberto' && (
                  <div className="obs-add-row">
                    <textarea
                      placeholder="Registrar observação, contato, atualização..."
                      value={novaObs}
                      onChange={(e) => setNovaObs(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          void handleAddObs();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="obs-add-btn"
                      disabled={addObs.isPending || !novaObs.trim()}
                      onClick={() => void handleAddObs()}
                    >
                      {addObs.isPending ? '...' : 'Adicionar'}
                    </button>
                  </div>
                )}

                <div className="obs-list">
                  {(observacoes ?? []).length === 0 && (
                    <p style={{ color: 'var(--text-3)', fontSize: '.85rem' }}>
                      Nenhuma observação ainda.
                    </p>
                  )}
                  {(observacoes ?? []).map((o) => (
                    <div key={o.id} className={`obs-item tipo-${o.tipo}`}>
                      <div className="obs-meta">
                        <span className="obs-autor">{o.autor_nome}</span>
                        <span>·</span>
                        <span>{formatDateTime(o.criado_em)}</span>
                        <span className="obs-tipo-badge">{o.tipo}</span>
                      </div>
                      <div className="obs-texto">{o.texto}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tab: Anexos ── */}
            {tab === 'anexos' && (
              <div className="lm-tab-body">
                {lead.status !== 'perdido' && (
                  <div
                    className="anx-upload-area"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                    onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('drag-over');
                      const file = e.dataTransfer.files[0];
                      if (file) void handleUpload(file);
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUpload(file);
                        e.target.value = '';
                      }}
                    />
                    <div className="anx-upload-icon">
                      {uploadAnexo.isPending ? '⏳' : '📎'}
                    </div>
                    <div className="anx-upload-label">
                      {uploadAnexo.isPending ? 'Enviando...' : 'Clique ou arraste um arquivo aqui'}
                    </div>
                    <div className="anx-upload-hint">Máx. 25 MB — PDF, imagens, planilhas, docs</div>
                  </div>
                )}

                <div className="anx-list">
                  {(anexos ?? []).length === 0 && (
                    <p style={{ color: 'var(--text-3)', fontSize: '.85rem' }}>
                      Nenhum arquivo anexado.
                    </p>
                  )}
                  {(anexos ?? []).map((a) => (
                    <div key={a.id} className="anx-item">
                      <span className="anx-icon">{fileIconForContentType(a.content_type)}</span>
                      <div className="anx-info">
                        <div className="anx-name">{a.nome_arquivo}</div>
                        <div className="anx-meta">
                          {formatBytes(a.tamanho_bytes)} · {a.autor_nome} · {formatDate(a.criado_em)}
                        </div>
                      </div>
                      <div className="anx-actions">
                        <button
                          type="button"
                          className="anx-btn-download"
                          onClick={() => void handleDownload(a.id, a.nome_arquivo)}
                        >
                          ↓ Baixar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Dialog>

      {showOutcome && lead && (
        <OutcomeDialog
          lead={lead}
          initialTab={outcomeTab}
          onClose={() => setShowOutcome(false)}
          onSuccess={() => { setShowOutcome(false); close(); }}
        />
      )}
    </>
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

function statusLabel(s: string): string {
  return (
    { em_aberto: 'Em aberto', ganho: 'Ganho', perdido: 'Perdido', em_producao: 'Em produção' }[s] ?? s
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
