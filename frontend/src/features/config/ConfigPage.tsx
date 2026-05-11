import { useState } from 'react';
import { toast } from 'sonner';

import { Dialog } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { useCurrentUser } from '@/hooks/useAuth';
import { useStages } from '@/hooks/queries/useStages';
import {
  useAuditLog,
  useCreateUser,
  useDeleteUser,
  useResetUserPassword,
  useToggleUser,
  useUsers,
} from '@/hooks/queries/useUsers';
import type { UserOut } from '@/api/schemas';
import { ROLE_LABELS } from '@/api/schemas';
import { formatDate, formatDateTime } from '@/lib/formatters';

import '@/features/clientes/clientes.css';
import './config.css';
import './config.css';

// Roles disponíveis por quem cria
const ALL_ROLES = [
  { value: 'adm_comercial',   label: 'Admin Comercial' },
  { value: 'adm_marketing',   label: 'Admin Marketing' },
  { value: 'adm_operacional', label: 'Admin Operacional' },
  { value: 'representante',   label: 'Representante' },
];

const ADM_COMERCIAL_ROLES = [{ value: 'representante', label: 'Representante' }];

type ConfigTab = 'perfil' | 'usuarios' | 'auditoria' | 'funil';

// ── NovoUsuarioModal ───────────────────────────────────────────────────────

function NovoUsuarioModal({ onClose, isMaster }: { onClose: () => void; isMaster: boolean }) {
  const createUser = useCreateUser();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [role, setRole] = useState('representante');
  const [result, setResult] = useState<{ nome: string; senha: string } | null>(null);

  const availableRoles = isMaster ? ALL_ROLES : ADM_COMERCIAL_ROLES;

  const handleSubmit = async () => {
    if (!nome.trim() || !email.trim()) {
      toast.warning('Nome e e-mail são obrigatórios');
      return;
    }
    try {
      const res = await createUser.mutateAsync({ nome: nome.trim(), email: email.trim(), telefone: telefone || null, role });
      setResult({ nome: res.user.nome, senha: res.senha_provisoria });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar usuário');
    }
  };

  if (result) {
    return (
      <Dialog open onOpenChange={o => { if (!o) onClose() }} title="✅ Usuário Criado!" width={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ color: 'var(--text-2)', fontSize: '.875rem' }}>
            O usuário <strong>{result.nome}</strong> foi criado. Compartilhe as credenciais abaixo:
          </p>
          <div className="cfg-credentials-box">
            <div className="cfg-cred-row">
              <span className="cfg-cred-label">E-mail (login)</span>
              <code className="cfg-cred-value">{email}</code>
            </div>
            <div className="cfg-cred-row">
              <span className="cfg-cred-label">Senha Provisória</span>
              <code className="cfg-cred-value cfg-pwd">{result.senha}</code>
              <button type="button" className="cfg-copy-btn" onClick={() => { void navigator.clipboard.writeText(result.senha); toast.success('Senha copiada!') }}>📋 Copiar</button>
            </div>
          </div>
          <p style={{ fontSize: '.78rem', color: 'var(--warning)', background: 'var(--warning-bg)', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--warning)' }}>
            ⚠️ Anote esta senha — ela não será exibida novamente. O usuário deverá trocá-la no primeiro acesso.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="pz-btn-save" onClick={onClose}>Fechar</button>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }} title="Novo Usuário" description="Preencha os dados para criar o acesso" width={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="rep-field"><label>Nome Completo *</label><input type="text" className="rep-field input" value={nome} onChange={e => setNome(e.target.value)} autoFocus placeholder="Nome do usuário" style={{ padding:'8px 10px', border:'var(--border-w) solid var(--border)', borderRadius:'var(--radius)', background:'var(--surface-2)', color:'var(--text-1)', fontSize:'.875rem', width:'100%', boxSizing:'border-box' }} /></div>
        <div className="rep-field"><label>E-mail (será o login) *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@dominio.com" style={{ padding:'8px 10px', border:'var(--border-w) solid var(--border)', borderRadius:'var(--radius)', background:'var(--surface-2)', color:'var(--text-1)', fontSize:'.875rem', width:'100%', boxSizing:'border-box' }} /></div>
        <div className="rep-field"><label>Telefone</label><input type="text" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(11) 99999-9999" style={{ padding:'8px 10px', border:'var(--border-w) solid var(--border)', borderRadius:'var(--radius)', background:'var(--surface-2)', color:'var(--text-1)', fontSize:'.875rem', width:'100%', boxSizing:'border-box' }} /></div>
        <div className="rep-field"><label>Hierarquia / Permissão *</label>
          <select value={role} onChange={e => setRole(e.target.value)} style={{ padding:'8px 10px', border:'var(--border-w) solid var(--border)', borderRadius:'var(--radius)', background:'var(--surface-2)', color:'var(--text-1)', fontSize:'.875rem', width:'100%', boxSizing:'border-box' }}>
            {availableRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:8, borderTop:'1px solid var(--border)' }}>
          <button type="button" className="pz-btn-cancel" onClick={onClose}>Cancelar</button>
          <button type="button" className="pz-btn-save" disabled={createUser.isPending} onClick={() => void handleSubmit()}>
            {createUser.isPending ? 'Criando...' : '+ Criar Usuário'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

// ── Main ConfigPage ────────────────────────────────────────────────────────

export function ConfigPage() {
  const { data: user } = useCurrentUser();
  const { data: stages } = useStages();
  const { data: users, isPending: usersLoading } = useUsers();
  const { data: auditLog, isPending: auditLoading } = useAuditLog();
  const toggleUser = useToggleUser();
  const resetPwd = useResetUserPassword();
  const deleteUser = useDeleteUser();

  const [tab, setTab] = useState<ConfigTab>('perfil');
  const [showNovo, setShowNovo] = useState(false);
  const [resetResult, setResetResult] = useState<{ nome: string; senha: string } | null>(null);

  const isMaster = user?.role === 'master';
  const isRep = user?.role === 'representante' || user?.role === 'vendedor';
  const canManageUsers = isMaster || user?.role === 'adm_comercial';

  const handleToggle = async (u: UserOut) => {
    const acao = u.ativo ? 'inativar' : 'reativar';
    if (!confirm(`${acao.charAt(0).toUpperCase() + acao.slice(1)} "${u.nome}"?`)) return;
    try {
      await toggleUser.mutateAsync(u.id);
      toast.success(`Usuário ${u.ativo ? 'inativado' : 'reativado'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  const handleDelete = async (u: UserOut) => {
    if (!confirm(`⚠️ EXCLUIR PERMANENTEMENTE "${u.nome}"?\n\nEsta ação não pode ser desfeita. O usuário perderá acesso imediatamente.`)) return;
    try {
      await deleteUser.mutateAsync(u.id);
      toast.success(`Usuário "${u.nome}" excluído permanentemente`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  };

  const handleResetPwd = async (u: UserOut) => {
    if (!confirm(`Resetar a senha de "${u.nome}"?\nUma nova senha provisória será gerada.`)) return;
    try {
      const res = await resetPwd.mutateAsync(u.id);
      setResetResult({ nome: res.user_nome, senha: res.senha_provisoria });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  // Representante vê apenas aba de perfil (alterar senha via /change-password)
  const visibleTabs: ConfigTab[] = isRep
    ? ['perfil']
    : isMaster
    ? ['perfil', 'usuarios', 'auditoria', 'funil']
    : ['perfil', 'usuarios'];

  return (
    <div className="page-padded">
      <div className="page-toolbar">
        <h1>Configurações</h1>
        {canManageUsers && tab === 'usuarios' && (
          <button type="button" className="pz-novo-btn" onClick={() => setShowNovo(true)}>
            + Novo Usuário
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="cfg-tabs">
        {visibleTabs.map(t => (
          <button key={t} type="button" className={`cfg-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {{ perfil: '👤 Perfil', usuarios: '👥 Usuários', auditoria: '📋 Auditoria', funil: '⚙️ Funil' }[t]}
          </button>
        ))}
      </div>

      {/* ── Tab: Perfil ── */}
      {tab === 'perfil' && (
        <div className="table-wrap" style={{ padding: 20 }}>
          <h3 style={{ marginBottom: 12, fontSize: '.95rem' }}>Meu Perfil</h3>
          <dl className="cfg-dl">
            <dt>Nome</dt><dd>{user?.nome}</dd>
            <dt>Email</dt><dd>{user?.email}</dd>
            <dt>Hierarquia</dt><dd><span className="cfg-role-badge">{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</span></dd>
          </dl>
          <div style={{ marginTop: 16 }}>
            <a href="/change-password" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 16px', background:'var(--primary)', color:'white', borderRadius:'var(--radius)', textDecoration:'none', fontWeight:700, fontSize:'.875rem' }}>
              🔒 Alterar Senha
            </a>
          </div>
          {isMaster && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ marginBottom: 8, fontSize: '.95rem' }}>Painel Administrativo</h3>
              <a href="/admin" target="_blank" rel="noopener" style={{ display:'inline-block', padding:'7px 16px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', textDecoration:'none', color:'var(--text-1)', fontWeight:600, fontSize:'.875rem' }}>
                Abrir SQLAdmin →
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Usuários ── */}
      {tab === 'usuarios' && (
        <div className="table-wrap">
          {usersLoading ? (
            <div style={{ padding:40, display:'flex', justifyContent:'center' }}><Spinner /></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Telefone</th>
                  <th>Hierarquia</th>
                  <th>Status</th>
                  <th>Cadastro</th>
                  {isMaster && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map(u => (
                  <tr key={u.id} style={{ opacity: u.ativo ? 1 : 0.5 }}>
                    <td>
                      <strong>{u.nome}</strong>
                      {u.senha_provisoria && <span className="cfg-badge-prov" title="Senha provisória ativa">🔑</span>}
                    </td>
                    <td style={{ fontSize:'.82rem', color:'var(--text-2)' }}>{u.email}</td>
                    <td style={{ fontSize:'.82rem' }}>{u.telefone ?? '—'}</td>
                    <td><span className="cfg-role-badge">{ROLE_LABELS[u.role] ?? u.role}</span></td>
                    <td>
                      <span className={`badge ${u.ativo ? 'badge-success' : 'badge-danger'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ fontSize:'.75rem', color:'var(--text-3)' }}>{formatDate(u.criado_em)}</td>
                    {isMaster && (
                      <td>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          <button type="button" className="cli-ver-btn" onClick={() => void handleToggle(u)} disabled={toggleUser.isPending}>
                            {u.ativo ? 'Inativar' : 'Reativar'}
                          </button>
                          <button type="button" className="cli-ver-btn" onClick={() => void handleResetPwd(u)} disabled={resetPwd.isPending} title="Gerar nova senha provisória">
                            🔑 Reset
                          </button>
                          <button type="button" className="cfg-btn-delete" onClick={() => void handleDelete(u)} disabled={deleteUser.isPending} title="Excluir usuário permanentemente">
                            🗑 Excluir
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {(users ?? []).length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign:'center', padding:32, color:'var(--text-3)' }}>Nenhum usuário cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Tab: Auditoria ── */}
      {tab === 'auditoria' && (
        <div className="table-wrap">
          {auditLoading ? (
            <div style={{ padding:40, display:'flex', justifyContent:'center' }}><Spinner /></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Usuário</th>
                  <th>Papel</th>
                  <th>Ação</th>
                  <th>Entidade</th>
                  <th>Descrição</th>
                </tr>
              </thead>
              <tbody>
                {(auditLog ?? []).map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize:'.75rem', color:'var(--text-3)', whiteSpace:'nowrap' }}>{formatDateTime(log.criado_em)}</td>
                    <td style={{ fontSize:'.82rem', fontWeight:600 }}>{log.user_nome}</td>
                    <td><span className="cfg-role-badge">{ROLE_LABELS[log.user_role] ?? log.user_role}</span></td>
                    <td><span className={`badge ${log.acao === 'delete' || log.acao === 'inativar' ? 'badge-danger' : log.acao === 'create' ? 'badge-success' : 'badge-info'}`}>{log.acao}</span></td>
                    <td style={{ fontSize:'.82rem' }}>{log.entidade}{log.entidade_id ? ` #${log.entidade_id.slice(0,8)}` : ''}</td>
                    <td style={{ fontSize:'.8rem', color:'var(--text-2)', maxWidth:320 }}>{log.descricao}</td>
                  </tr>
                ))}
                {(auditLog ?? []).length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign:'center', padding:32, color:'var(--text-3)' }}>Nenhuma ação registrada ainda.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Tab: Funil ── */}
      {tab === 'funil' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Ordem</th><th>Slug</th><th>Label</th><th>SLA (h)</th><th>Probabilidade</th><th>Cor</th></tr>
            </thead>
            <tbody>
              {(stages ?? []).map(s => (
                <tr key={s.id}>
                  <td>{s.ordem}</td>
                  <td><code>{s.slug}</code></td>
                  <td>{s.icone} {s.label}</td>
                  <td>{s.sla_horas}</td>
                  <td>{s.prob_pct}%</td>
                  <td>
                    <span style={{ display:'inline-block', width:14, height:14, background:s.cor, borderRadius:3, marginRight:6, verticalAlign:'middle' }} />
                    <code style={{ fontSize:'.75rem' }}>{s.cor}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ── */}
      {showNovo && (
        <NovoUsuarioModal onClose={() => setShowNovo(false)} isMaster={isMaster} />
      )}

      {resetResult && (
        <Dialog open onOpenChange={o => { if (!o) setResetResult(null) }} title="🔑 Senha Resetada" width={420}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <p style={{ fontSize:'.875rem', color:'var(--text-2)' }}>Nova senha provisória para <strong>{resetResult.nome}</strong>:</p>
            <div className="cfg-credentials-box">
              <div className="cfg-cred-row">
                <code className="cfg-cred-value cfg-pwd">{resetResult.senha}</code>
                <button type="button" className="cfg-copy-btn" onClick={() => { void navigator.clipboard.writeText(resetResult.senha); toast.success('Copiado!') }}>📋</button>
              </div>
            </div>
            <p style={{ fontSize:'.75rem', color:'var(--warning)' }}>O usuário deverá trocar ao próximo acesso.</p>
            <div style={{ textAlign:'right' }}><button type="button" className="pz-btn-save" onClick={() => setResetResult(null)}>Fechar</button></div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
