import { useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { useRepresentantesAll, useCreateRepresentante, useUpdateRepresentante } from '@/hooks/queries/useRepresentantes'
import { useLeads } from '@/hooks/queries/useLeads'
import { useStages } from '@/hooks/queries/useStages'
import { useClientes } from '@/hooks/queries/useClientes'
import { listAnexosRep, uploadAnexoRep, type RepFullPayload } from '@/api/representantes'
import type { Representante, Lead, Anexo } from '@/api/schemas'
import { formatBRL, formatDate, formatRelative } from '@/lib/formatters'
import { fileIconForContentType } from '@/features/kanban/utils'
import '@/features/clientes/clientes.css'
import './vendedores.css'
import { useAuthStore } from '@/store/authStore'

type Tab = 'ativos' | 'canal_proprio' | 'representantes' | 'inativos'
type FormTab = 'identificacao' | 'contato' | 'financeiro' | 'redes' | 'documentos'

const FORM_TABS: { key: FormTab; label: string }[] = [
  { key: 'identificacao', label: '👤 Identificação' },
  { key: 'contato',       label: '📞 Contato' },
  { key: 'financeiro',    label: '💰 Financeiro' },
  { key: 'redes',         label: '🌐 Redes Sociais' },
  { key: 'documentos',    label: '📎 Documentos' },
]

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase()
}

function rankingEmoji(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function emptyForm(): RepFullPayload {
  return {
    nome: '', nome_fantasia: '', razao_social: '', cnpj: '',
    canal: 'canal_proprio', comissao_pct: 0,
    email: '', telefone: '', endereco: '', cep: '', cidade: '', estado: '',
    banco: '', agencia: '', conta: '', pix: '', obs_financeiro: '',
    instagram: '', linkedin: '', tiktok: '', website: '', outras_redes: '',
  }
}

function repToForm(r: Representante): RepFullPayload {
  return {
    nome: r.nome, nome_fantasia: r.nome_fantasia ?? '', razao_social: r.razao_social ?? '',
    cnpj: r.cnpj ?? '', canal: r.canal as 'canal_proprio' | 'representante', comissao_pct: Number(r.comissao_pct),
    email: r.email ?? '', telefone: r.telefone ?? '', endereco: r.endereco ?? '',
    cep: r.cep ?? '', cidade: r.cidade ?? '', estado: r.estado ?? '',
    banco: r.banco ?? '', agencia: r.agencia ?? '', conta: r.conta ?? '',
    pix: r.pix ?? '', obs_financeiro: r.obs_financeiro ?? '',
    instagram: r.instagram ?? '', linkedin: r.linkedin ?? '', tiktok: r.tiktok ?? '',
    website: r.website ?? '', outras_redes: r.outras_redes ?? '',
  }
}

function cleanPayload(form: RepFullPayload): RepFullPayload {
  const s = (v: string | null | undefined) => v?.trim() || null
  return {
    ...form,
    nome: form.nome.trim(),
    nome_fantasia: s(form.nome_fantasia), razao_social: s(form.razao_social), cnpj: s(form.cnpj),
    email: s(form.email), telefone: s(form.telefone), endereco: s(form.endereco),
    cep: s(form.cep), cidade: s(form.cidade),
    estado: s(form.estado)?.toUpperCase().slice(0, 2) ?? null,
    banco: s(form.banco), agencia: s(form.agencia), conta: s(form.conta), pix: s(form.pix),
    obs_financeiro: s(form.obs_financeiro),
    instagram: s(form.instagram), linkedin: s(form.linkedin), tiktok: s(form.tiktok),
    website: s(form.website), outras_redes: s(form.outras_redes),
  }
}

// ── RepFormModal ──────────────────────────────────────────────────────────────
function RepFormModal({ open, onClose, initial, onSave, saving }: {
  open: boolean; onClose: () => void; initial?: Representante | null;
  onSave: (p: RepFullPayload) => Promise<void>; saving: boolean
}) {
  const [formTab, setFormTab] = useState<FormTab>('identificacao')
  const [form, setForm] = useState<RepFullPayload>(() => initial ? repToForm(initial) : emptyForm())
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [loadingAnexos, setLoadingAnexos] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const isEdit = !!initial

  const handleTabChange = async (tab: FormTab) => {
    setFormTab(tab)
    if (tab === 'documentos' && initial?.id && anexos.length === 0 && !loadingAnexos) {
      setLoadingAnexos(true)
      try { setAnexos(await listAnexosRep(initial.id)) }
      catch { toast.error('Falha ao carregar documentos') }
      finally { setLoadingAnexos(false) }
    }
  }

  const set = (field: keyof RepFullPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleUpload = async (file: File) => {
    if (!initial?.id) { toast.warning('Salve o cadastro primeiro'); return }
    setUploading(true)
    try { const a = await uploadAnexoRep(initial.id, file); setAnexos(prev => [a, ...prev]); toast.success('Documento enviado') }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Erro no upload') }
    finally { setUploading(false) }
  }

  const handleDownload = async (id: string, nome: string) => {
    try {
      const res = await fetch(`/api/v1/anexos/${id}/download`, { credentials: 'include' })
      if (!res.ok) throw new Error('Falha')
      const blob = await res.blob(); const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = nome; a.click()
      URL.revokeObjectURL(url)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erro') }
  }

  const handleSubmit = async () => {
    if (!form.nome.trim()) { toast.warning('Nome obrigatório'); setFormTab('identificacao'); return }
    await onSave(cleanPayload(form))
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}
      title={isEdit ? `Editar — ${initial.nome}` : 'Novo Vendedor / Representante'}
      description="Preencha as abas com os dados do cadastro" width={640}>
      <div className="rep-form-tabs">
        {FORM_TABS.map(t => (
          <button key={t.key} type="button" className={`rep-form-tab${formTab === t.key ? ' active' : ''}`}
            onClick={() => void handleTabChange(t.key)}>{t.label}</button>
        ))}
      </div>
      <div className="rep-form">
        {formTab === 'identificacao' && (
          <>
            <div className="rep-grid-2">
              <div className="rep-field" style={{ gridColumn: 'span 2' }}>
                <label>Nome Completo *</label>
                <input type="text" value={form.nome} onChange={set('nome')} maxLength={200} autoFocus placeholder="Nome do vendedor ou representante" />
              </div>
              <div className="rep-field">
                <label>Nome Fantasia</label>
                <input type="text" value={form.nome_fantasia ?? ''} onChange={set('nome_fantasia')} maxLength={200} />
              </div>
              <div className="rep-field">
                <label>Razão Social</label>
                <input type="text" value={form.razao_social ?? ''} onChange={set('razao_social')} maxLength={200} />
              </div>
              <div className="rep-field">
                <label>CNPJ / CPF</label>
                <input type="text" value={form.cnpj ?? ''} onChange={set('cnpj')} maxLength={20} placeholder="00.000.000/0001-00" />
              </div>
              <div className="rep-field">
                <label>Tipo de Canal *</label>
                <select value={form.canal} onChange={set('canal')}>
                  <option value="canal_proprio">Canal Próprio (Vendedor interno)</option>
                  <option value="representante">Representante Externo</option>
                </select>
              </div>
              <div className="rep-field">
                <label>Comissão %</label>
                <input type="number" value={form.comissao_pct ?? 0} onChange={set('comissao_pct')} min={0} max={100} step={0.01} />
              </div>
            </div>
            <div className="rep-hint">
              <strong>Canal Próprio:</strong> vendedor interno da equipe Friomac.<br />
              <strong>Representante:</strong> parceiro externo que indica clientes.
            </div>
          </>
        )}
        {formTab === 'contato' && (
          <div className="rep-grid-2">
            <div className="rep-field">
              <label>E-mail</label>
              <input type="email" value={form.email ?? ''} onChange={set('email')} placeholder="vendedor@email.com" />
            </div>
            <div className="rep-field">
              <label>Telefone / WhatsApp</label>
              <input type="text" value={form.telefone ?? ''} onChange={set('telefone')} placeholder="(11) 99999-9999" maxLength={40} />
            </div>
            <div className="rep-field" style={{ gridColumn: 'span 2' }}>
              <label>Endereço</label>
              <input type="text" value={form.endereco ?? ''} onChange={set('endereco')} maxLength={255} placeholder="Rua, número, complemento" />
            </div>
            <div className="rep-field">
              <label>CEP</label>
              <input type="text" value={form.cep ?? ''} onChange={set('cep')} maxLength={10} placeholder="00000-000" />
            </div>
            <div className="rep-field">
              <label>Cidade</label>
              <input type="text" value={form.cidade ?? ''} onChange={set('cidade')} maxLength={100} />
            </div>
            <div className="rep-field">
              <label>Estado (UF)</label>
              <input type="text" value={form.estado ?? ''} onChange={set('estado')} maxLength={2} placeholder="SP" />
            </div>
          </div>
        )}
        {formTab === 'financeiro' && (
          <div className="rep-grid-2">
            <div className="rep-field">
              <label>Banco</label>
              <input type="text" value={form.banco ?? ''} onChange={set('banco')} maxLength={100} placeholder="Ex: Itaú, Bradesco, Nubank" />
            </div>
            <div className="rep-field">
              <label>Agência</label>
              <input type="text" value={form.agencia ?? ''} onChange={set('agencia')} maxLength={20} placeholder="0000" />
            </div>
            <div className="rep-field">
              <label>Conta Corrente</label>
              <input type="text" value={form.conta ?? ''} onChange={set('conta')} maxLength={30} placeholder="00000-0" />
            </div>
            <div className="rep-field">
              <label>Chave PIX</label>
              <input type="text" value={form.pix ?? ''} onChange={set('pix')} maxLength={100} placeholder="CPF, CNPJ, e-mail ou celular" />
            </div>
            <div className="rep-field" style={{ gridColumn: 'span 2' }}>
              <label>Observações Financeiras</label>
              <textarea value={form.obs_financeiro ?? ''} onChange={set('obs_financeiro')} rows={3} placeholder="Condições de pagamento, preferências..." />
            </div>
          </div>
        )}
        {formTab === 'redes' && (
          <div className="rep-grid-2">
            <div className="rep-field">
              <label>Instagram</label>
              <input type="text" value={form.instagram ?? ''} onChange={set('instagram')} maxLength={100} placeholder="@usuario" />
            </div>
            <div className="rep-field">
              <label>LinkedIn</label>
              <input type="text" value={form.linkedin ?? ''} onChange={set('linkedin')} maxLength={200} placeholder="linkedin.com/in/..." />
            </div>
            <div className="rep-field">
              <label>TikTok</label>
              <input type="text" value={form.tiktok ?? ''} onChange={set('tiktok')} maxLength={100} placeholder="@usuario" />
            </div>
            <div className="rep-field">
              <label>Website</label>
              <input type="url" value={form.website ?? ''} onChange={set('website')} maxLength={200} placeholder="https://..." />
            </div>
            <div className="rep-field" style={{ gridColumn: 'span 2' }}>
              <label>Outras Redes / Links</label>
              <input type="text" value={form.outras_redes ?? ''} onChange={set('outras_redes')} maxLength={200} placeholder="YouTube, Facebook, etc." />
            </div>
          </div>
        )}
        {formTab === 'documentos' && (
          !isEdit ? (
            <div className="rep-docs-notice">💡 Salve o cadastro primeiro para poder anexar documentos.</div>
          ) : (
            <>
              <div className="rep-docs-cats">
                <p className="rep-docs-label">Documentos necessários:</p>
                <div className="rep-docs-chips">
                  {['Contrato Social','Comprv. Endereço','Cartão CNPJ','Comprv. Bancário','Documento com Foto','Contrato de Representação'].map(d => (
                    <span key={d} className="rep-doc-chip">{d}</span>
                  ))}
                </div>
              </div>
              <div className="anx-upload-area" style={{ marginBottom: 12 }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }}
                onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
                onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); const f = e.dataTransfer.files[0]; if (f) void handleUpload(f) }}>
                <input ref={fileRef} type="file" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = '' }} />
                <div className="anx-upload-icon">{uploading ? '⏳' : '📎'}</div>
                <div className="anx-upload-label">{uploading ? 'Enviando...' : 'Clique ou arraste um documento'}</div>
                <div className="anx-upload-hint">PDF, imagens, Word — máx. 25 MB</div>
              </div>
              {loadingAnexos ? <div style={{ textAlign:'center', padding:20 }}><Spinner /></div> : (
                <div className="anx-list">
                  {anexos.length === 0 && <p style={{ color:'var(--text-3)', fontSize:'.85rem' }}>Nenhum documento enviado.</p>}
                  {anexos.map(a => (
                    <div key={a.id} className="anx-item">
                      <span className="anx-icon">{fileIconForContentType(a.content_type)}</span>
                      <div className="anx-info">
                        <div className="anx-name">{a.nome_arquivo}</div>
                        <div className="anx-meta">{formatBytes(a.tamanho_bytes)} · {a.autor_nome} · {formatDate(a.criado_em)}</div>
                      </div>
                      <div className="anx-actions">
                        <button type="button" className="anx-btn-download" onClick={() => void handleDownload(a.id, a.nome_arquivo)}>↓ Baixar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        )}
        {formTab !== 'documentos' ? (
          <div className="rep-submit-row">
            <button type="button" className="rep-btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="button" className="rep-btn-save" disabled={saving} onClick={() => void handleSubmit()}>
              {saving ? 'Salvando...' : isEdit ? '✓ Salvar Alterações' : '+ Criar Cadastro'}
            </button>
          </div>
        ) : (
          <div className="rep-submit-row">
            <button type="button" className="rep-btn-cancel" onClick={onClose}>Fechar</button>
          </div>
        )}
      </div>
    </Dialog>
  )
}

// ── RepLeadsModal ─────────────────────────────────────────────────────────────
function RepLeadsModal({ rep, leads, open, onClose }: { rep: Representante; leads: Lead[]; open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { data: stages = [] } = useStages()
  const { data: clientes = [] } = useClientes()
  const stagesMap = useMemo(() => new Map(stages.map(s => [s.id, s])), [stages])
  const clientesMap = useMemo(() => new Map(clientes.map(c => [c.id, c])), [clientes])

  const STATUS_LABEL: Record<string, string> = { em_aberto: 'Em aberto', ganho: '🏆 Ganho', perdido: '❌ Perdido', em_producao: 'Produção' }
  const STATUS_COLOR: Record<string, string> = { em_aberto: 'var(--primary)', ganho: 'var(--success)', perdido: 'var(--danger)', em_producao: 'var(--info)' }

  const exportCSV = () => {
    const h = ['Código','Cliente','Projeto','Stage','Valor','Status','Data']
    const rows = leads.map(l => [l.codigo, clientesMap.get(l.cliente_id)?.nome_fantasia ?? '—', l.projeto ?? '—', stagesMap.get(l.stage_id)?.label ?? '—', String(l.valor), l.status, l.data_abertura.slice(0,10)])
    const csv = [h,...rows].map(r => r.map(v => `"${v}"`).join(';')).join('\n')
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `leads_${rep.nome.replace(/\s+/g,'_')}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const printLeads = () => {
    const rows = leads.map(l => `<tr><td>${l.codigo}</td><td>${clientesMap.get(l.cliente_id)?.nome_fantasia ?? '—'}</td><td>${l.projeto ?? '—'}</td><td>${stagesMap.get(l.stage_id)?.label ?? '—'}</td><td>R$ ${Number(l.valor).toFixed(2)}</td><td>${STATUS_LABEL[l.status] ?? l.status}</td></tr>`).join('')
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Leads — ${rep.nome}</title><style>body{font-family:Arial,sans-serif;font-size:11px}table{border-collapse:collapse;width:100%}th{background:#f4f4f4;padding:6px 8px;text-align:left;border:1px solid #ddd;font-size:10px;text-transform:uppercase}td{padding:5px 8px;border:1px solid #eee}tr:nth-child(even){background:#fafafa}@media print{@page{margin:1cm}}</style></head><body><h2>Leads — ${rep.nome}</h2><p>${leads.length} registros · ${new Date().toLocaleDateString('pt-BR')}</p><table><thead><tr><th>Código</th><th>Cliente</th><th>Projeto</th><th>Stage</th><th>Valor</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
    const w = window.open('','_blank','width=900,height=700'); if (!w) return
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }} title={`Leads — ${rep.nome}`} description={`${leads.length} lead${leads.length !== 1 ? 's' : ''}`} width={760}>
      <div className="rep-leads-toolbar">
        <span className="rep-leads-count">
          {leads.filter(l => l.status === 'em_aberto').length} em aberto · {leads.filter(l => l.status === 'ganho').length} ganhos · {formatBRL(leads.filter(l => l.status === 'em_aberto').reduce((s,l) => s + l.valor, 0))} em pipeline
        </span>
        <button type="button" className="rep-export-btn" onClick={exportCSV}>📊 CSV</button>
        <button type="button" className="rep-export-btn" onClick={printLeads}>🖨️ Imprimir</button>
      </div>
      {leads.length === 0 ? (
        <p style={{ color:'var(--text-3)', textAlign:'center', padding:24 }}>Nenhum lead associado.</p>
      ) : (
        <div className="rep-leads-list">
          {[...leads].sort((a,b) => new Date(b.data_abertura).getTime() - new Date(a.data_abertura).getTime()).map(lead => {
            const stage = stagesMap.get(lead.stage_id)
            const cli = clientesMap.get(lead.cliente_id)
            return (
              <button key={lead.id} type="button" className="rep-lead-row" onClick={() => { onClose(); navigate(`/clientes/${lead.cliente_id}`) }}>
                <span style={{ fontSize:'.72rem', color:'var(--text-3)', fontWeight:700, minWidth:50 }}>#{lead.codigo}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'.88rem', fontWeight:700, color:'var(--text-1)' }}>{cli?.nome_fantasia ?? '—'}</div>
                  <div style={{ fontSize:'.72rem', color:'var(--text-3)' }}>{lead.projeto ?? '—'} · {formatRelative(lead.data_abertura)}</div>
                </div>
                {stage && <span style={{ fontSize:'.72rem', fontWeight:700, padding:'2px 8px', borderRadius:999, border:`1px solid ${stage.cor}`, color:stage.cor, whiteSpace:'nowrap' }}>{stage.label}</span>}
                <span style={{ fontSize:'.88rem', fontWeight:800, color:'var(--success)', whiteSpace:'nowrap' }}>{formatBRL(lead.valor)}</span>
                <span style={{ fontSize:'.75rem', fontWeight:700, color: STATUS_COLOR[lead.status] ?? 'var(--text-2)', whiteSpace:'nowrap' }}>{STATUS_LABEL[lead.status] ?? lead.status}</span>
                <span style={{ color:'var(--text-3)' }}>→</span>
              </button>
            )
          })}
        </div>
      )}
    </Dialog>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function VendedoresPage() {
  const [activeTab, setActiveTab] = useState<Tab>('ativos')
  const [showForm, setShowForm] = useState(false)
  const [editRep, setEditRep] = useState<Representante | null>(null)
  const [leadsRep, setLeadsRep] = useState<Representante | null>(null)

  const { data: reps = [], isPending: repsPending } = useRepresentantesAll()
  const { data: leads = [], isPending: leadsPending } = useLeads()
  const createRep = useCreateRepresentante()
  const updateRep = useUpdateRepresentante()
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'master'

  const enriched = useMemo(() => reps.map(rep => {
    const repLeads = leads.filter(l => l.representante_id === rep.id)
    const qtdLeadsAtivos = repLeads.filter(l => l.status === 'em_aberto').length
    const totalOrc = repLeads.reduce((s, l) => s + Number(l.valor), 0)
    const fechados = repLeads.filter(l => l.status === 'ganho').length
    const perdidos = repLeads.filter(l => l.status === 'perdido').length
    const taxa = (fechados + perdidos) > 0 ? (fechados / (fechados + perdidos)) * 100 : 0
    return { ...rep, qtdLeadsAtivos, totalOrc, fechados, perdidos, taxa, allLeads: repLeads }
  }), [reps, leads])

  const rankingMap = useMemo(() => {
    const sorted = [...enriched.filter(r => r.ativo)].sort((a,b) => b.totalOrc - a.totalOrc)
    return new Map(sorted.map((r,i) => [r.id, i+1]))
  }, [enriched])

  const filtered = useMemo(() => {
    if (activeTab === 'ativos') return enriched.filter(r => r.ativo)
    if (activeTab === 'canal_proprio') return enriched.filter(r => r.ativo && r.canal === 'canal_proprio')
    if (activeTab === 'representantes') return enriched.filter(r => r.ativo && r.canal === 'representante')
    return enriched.filter(r => !r.ativo)
  }, [enriched, activeTab])

  const filteredStats = useMemo(() => ({
    count: filtered.length,
    leadsAtivos: filtered.reduce((s,r) => s + r.qtdLeadsAtivos, 0),
    fechados: filtered.reduce((s,r) => s + r.fechados, 0),
    totalOrc: filtered.reduce((s,r) => s + r.totalOrc, 0),
  }), [filtered])

  const counts = useMemo(() => ({
    ativos: enriched.filter(r => r.ativo).length,
    canal: enriched.filter(r => r.ativo && r.canal === 'canal_proprio').length,
    reps: enriched.filter(r => r.ativo && r.canal === 'representante').length,
    inativos: enriched.filter(r => !r.ativo).length,
  }), [enriched])

  const handleSave = async (payload: RepFullPayload) => {
    try {
      if (editRep) { await updateRep.mutateAsync({ id: editRep.id, payload }); toast.success('Cadastro atualizado!') }
      else { await createRep.mutateAsync(payload); toast.success('Vendedor cadastrado!') }
      setShowForm(false); setEditRep(null)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Falha ao salvar') }
  }

  const handleInativar = async (rep: Representante) => {
    if (!confirm(`Inativar "${rep.nome}"?\nEle não aparecerá nos dropdowns de lead.`)) return
    try { await updateRep.mutateAsync({ id: rep.id, payload: { ativo: false } }); toast.success(`${rep.nome} inativado`) }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Falha') }
  }

  const handleReativar = async (rep: Representante) => {
    try { await updateRep.mutateAsync({ id: rep.id, payload: { ativo: true } }); toast.success(`${rep.nome} reativado`) }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Falha') }
  }

  if (repsPending || leadsPending) return <div style={{ padding:60, display:'flex', justifyContent:'center' }}><Spinner label="Carregando..." /></div>

  return (
    <div className="page-padded">
      <div className="vend-stats-row">
        <StatCard value={filteredStats.count} label="Vendedores" icon="👤" />
        <StatCard value={filteredStats.leadsAtivos} label="Leads Ativos" icon="🔄" />
        <StatCard value={filteredStats.fechados} label="Fechamentos" icon="🏆" />
        <StatCard value={formatBRL(filteredStats.totalOrc)} label="Total Orçado" icon="💰" />
      </div>

      <div className="vend-toolbar">
        <div className="vend-tabs">
          <TabBtn active={activeTab==='ativos'} onClick={() => setActiveTab('ativos')}>Todos Ativos ({counts.ativos})</TabBtn>
          <TabBtn active={activeTab==='canal_proprio'} onClick={() => setActiveTab('canal_proprio')}>Canal Próprio ({counts.canal})</TabBtn>
          <TabBtn active={activeTab==='representantes'} onClick={() => setActiveTab('representantes')}>Representantes ({counts.reps})</TabBtn>
          <TabBtn active={activeTab==='inativos'} onClick={() => setActiveTab('inativos')}>Inativos ({counts.inativos})</TabBtn>
        </div>
        {isAdmin && (
          <button type="button" className="vend-novo-btn" onClick={() => { setEditRep(null); setShowForm(true) }}>
            <span className="vend-novo-icon">+</span>Novo Vendedor
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>Nenhum resultado.</div>
      ) : (
        <div className="vend-grid">
          {filtered.map(rep => {
            const rank = rankingMap.get(rep.id)
            const inativo = !rep.ativo
            return (
              <div key={rep.id} className={`vend-card${inativo ? ' inativo' : ''}`}>
                <div className="vend-card-header">
                  <div className={`vend-avatar${inativo ? ' inativo' : ''}`}>{getInitials(rep.nome)}</div>
                  <div className="vend-card-info">
                    <div className="vend-card-name-row">
                      <strong className="vend-card-name">{rep.nome}</strong>
                      {inativo && <span className="vend-tag-inativo">Inativo</span>}
                      {rank && <span title={`${rank}º lugar`} style={{ fontSize:'1.1rem' }}>{rankingEmoji(rank)}</span>}
                    </div>
                    <div className="vend-card-meta-row">
                      <span className={`vend-canal-badge ${rep.canal}`}>
                        {rep.canal === 'canal_proprio' ? 'Canal Próprio' : 'Representante'}
                      </span>
                      {rep.cidade && <span className="vend-card-cidade">📍 {rep.cidade}{rep.estado ? `/${rep.estado}` : ''}</span>}
                    </div>
                  </div>
                </div>
                <div className="vend-stats-grid">
                  <RepStat label="Leads Ativos" value={rep.qtdLeadsAtivos} />
                  <RepStat label="Fechados" value={rep.fechados} />
                  <RepStat label="Total Orçado" value={formatBRL(rep.totalOrc)} />
                  <RepStat label="Conversão" value={rep.taxa > 0 ? `${rep.taxa.toFixed(1)}%` : '—'} />
                </div>
                {(rep.telefone || rep.email) && (
                  <div className="vend-contato">
                    {rep.telefone && <span>📞 {rep.telefone}</span>}
                    {rep.email && <span>✉ {rep.email}</span>}
                  </div>
                )}
                <div className="vend-card-footer">
                  <span className="vend-comissao">Comissão: {rep.comissao_pct}%</span>
                  <div className="vend-card-actions">
                    <button type="button" className="vend-btn-sm" onClick={() => { setEditRep(rep); setShowForm(true) }}>✎ Editar</button>
                    <button type="button" className="vend-btn-sm" onClick={() => setLeadsRep(rep)}>📋 Leads ({rep.allLeads.length})</button>
                  </div>
                  {isAdmin && (
                    <div style={{ marginTop:6 }}>
                      {rep.ativo
                        ? <button type="button" className="vend-btn-inativar" onClick={() => void handleInativar(rep)}>Inativar</button>
                        : <button type="button" className="vend-btn-reativar" onClick={() => void handleReativar(rep)}>↺ Reativar</button>
                      }
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <RepFormModal open={showForm} onClose={() => { setShowForm(false); setEditRep(null) }}
          initial={editRep} onSave={handleSave} saving={createRep.isPending || updateRep.isPending} />
      )}
      {leadsRep && (
        <RepLeadsModal rep={leadsRep} leads={leads.filter(l => l.representante_id === leadsRep.id)}
          open={!!leadsRep} onClose={() => setLeadsRep(null)} />
      )}
    </div>
  )
}

function StatCard({ value, label, icon }: { value: string | number; label: string; icon: string }) {
  return (
    <div className="vend-stat-card">
      <span className="vend-stat-icon">{icon}</span>
      <div>
        <strong className="vend-stat-value">{value}</strong>
        <span className="vend-stat-label">{label}</span>
      </div>
    </div>
  )
}

function RepStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="vend-rep-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={`vend-tab-btn${active ? ' active' : ''}`} onClick={onClick}>{children}</button>
  )
}
