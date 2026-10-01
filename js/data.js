/* =====================================================
   FRIOMAC CRM — Data Store
   Dados servidos pela API (/api/*), persistidos em PostgreSQL
   no servidor. Mesma API pública de antes — os dados em memória
   (_state) agora são carregados via fetch no init() e cada
   mutação dispara a chamada HTTP correspondente além de
   atualizar o estado local (UI permanece responsiva).
   ===================================================== */

const FriomacData = (function() {

  const API_BASE = '/api';

  async function _apiList(resource) {
    const r = await fetch(`${API_BASE}/${resource}`);
    if (!r.ok) throw new Error(`GET ${resource} falhou`);
    return r.json();
  }
  function _apiCreate(resource, data) {
    return fetch(`${API_BASE}/${resource}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }).catch(e => console.error(`[api] criar ${resource} falhou`, e));
  }
  function _apiUpdate(resource, id, data) {
    return fetch(`${API_BASE}/${resource}/${encodeURIComponent(id)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }).catch(e => console.error(`[api] atualizar ${resource}/${id} falhou`, e));
  }
  function _apiDelete(resource, id) {
    return fetch(`${API_BASE}/${resource}/${encodeURIComponent(id)}`, { method: 'DELETE' })
      .catch(e => console.error(`[api] excluir ${resource}/${id} falhou`, e));
  }

  // ── MENUS & PERMISSÕES BASE ──────────────────────────
  const ALL_MENUS  = ['dashboard','kanban','orcamentos','clientes','vendedores','campanhas','comissoes','prazo','config'];
  const ALL_EDIT   = Object.fromEntries(ALL_MENUS.map(m => [m,'edicao']));
  const MENU_LABELS = [
    { id:'dashboard',  label:'Dashboard' },
    { id:'kanban',     label:'Gestão de Leads' },
    { id:'orcamentos', label:'Orçamentos' },
    { id:'clientes',   label:'Clientes' },
    { id:'vendedores', label:'Vendedores & Representantes' },
    { id:'campanhas',  label:'Campanhas & Mídias' },
    { id:'comissoes',  label:'Comissões' },
    { id:'prazo',      label:'Prazo de Entrega' },
  ];

  const CARGOS = ['Sócio Administrador','Gerente Comercial','Gerente Financeiro','Vendedor','Representante','Administrativo','Financeiro','Marketing','Técnico','Outro'];
  const ROLE_LABELS = { master:'ADM Master', adm_geral:'ADM Geral', vendedor:'Vendedor', representante:'Representante', administrativo:'Administrativo', financeiro:'Financeiro' };

  const _VEND_MENUS  = ['dashboard','kanban','orcamentos','campanhas','config'];
  const _VEND_ACESSO = { dashboard:'visualizacao', kanban:'edicao', orcamentos:'edicao', campanhas:'visualizacao', config:'edicao' };
  const _REP_MENUS   = ['dashboard','kanban','campanhas','config'];
  const _REP_ACESSO  = { dashboard:'visualizacao', kanban:'edicao', campanhas:'visualizacao', config:'edicao' };

  const PERFIS_PREDEFINIDOS = {
    vendedor: {
      label: 'Vendedor', role:'vendedor',
      menuPermissoes: _VEND_MENUS, tipoAcesso: _VEND_ACESSO, scopeRestrito: true,
      descricao: 'Dashboard, Leads, Orçamentos e Campanhas — apenas dados próprios',
    },
    representante: {
      label: 'Representante', role:'representante',
      menuPermissoes: _REP_MENUS, tipoAcesso: _REP_ACESSO, scopeRestrito: true,
      descricao: 'Dashboard, Leads e Campanhas — apenas dados próprios',
    },
  };

  // ── ESTÁGIOS DO FUNIL ────────────────────────────────
  const STAGES = [
    { id: 'novo_lead',       label: 'Novo Lead',         icon: '📥', sla: '2h',  slaHoras: 2,   cor: '#0EA5E9', prob: 10 },
    { id: 'visita_loco',     label: 'Visita In Loco',    icon: '🏢', sla: '72h', slaHoras: 72,  cor: '#7C3AED', prob: 25 },
    { id: 'orcamento_env',   label: 'Orçamento Enviado', icon: '📄', sla: '24h', slaHoras: 24,  cor: '#0D9488', prob: 40 },
    { id: 'follow_up',       label: 'Follow Up',         icon: '📞', sla: '48h', slaHoras: 48,  cor: '#D97706', prob: 55 },
    { id: 'pre_projeto',     label: 'Pré-Projeto 2D/3D', icon: '📐', sla: '72h', slaHoras: 72,  cor: '#E8500A', prob: 70 },
    { id: 'visita_fech',     label: 'Visita Fechamento', icon: '🤝', sla: '48h', slaHoras: 48,  cor: '#DC2626', prob: 80 },
    { id: 'contrato_env',    label: 'Contrato Enviado',  icon: '📋', sla: '24h', slaHoras: 24,  cor: '#16A34A', prob: 90 },
    { id: 'decisao_final',   label: 'Decisão Final',     icon: '✅', sla: '—',   slaHoras: 0,   cor: '#15803D', prob: 100 },
  ];

  // ── KPIs E METAS (metas fixas; números calculados vêm de getKPIs()) ──
  const KPIS = {
    metaAnual: 12000000,
    vendedoresAtivos: 15,
    onTimeDelivery: 98,
    metas: { taxaConversao:35, ticketMedio:130000, orcMes:80, fechMes:20, receitaVendMes:350000 },
    mensal: [
      { mes:'Jan', qtdOrc:43, totalOrc:2397335, qtdFech:0, totalFech:0 },
      { mes:'Fev', qtdOrc:14, totalOrc:1353582, qtdFech:0, totalFech:0 },
      { mes:'Mar', qtdOrc:0,  totalOrc:0,       qtdFech:0, totalFech:0 },
      { mes:'Abr', qtdOrc:12, totalOrc:388920,  qtdFech:0, totalFech:0 },
      { mes:'Mai', qtdOrc:0,  totalOrc:0,       qtdFech:0, totalFech:0 },
      { mes:'Jun', qtdOrc:0,  totalOrc:0,       qtdFech:0, totalFech:0 },
      { mes:'Jul', qtdOrc:0,  totalOrc:0,       qtdFech:0, totalFech:0 },
      { mes:'Ago', qtdOrc:0,  totalOrc:0,       qtdFech:0, totalFech:0 },
      { mes:'Set', qtdOrc:0,  totalOrc:0,       qtdFech:0, totalFech:0 },
      { mes:'Out', qtdOrc:0,  totalOrc:0,       qtdFech:0, totalFech:0 },
      { mes:'Nov', qtdOrc:0,  totalOrc:0,       qtdFech:0, totalFech:0 },
      { mes:'Dez', qtdOrc:0,  totalOrc:0,       qtdFech:0, totalFech:0 },
    ]
  };

  // ── STATE / STORE (populado via API no init) ─────────
  let _state = {
    currentUser: null,
    users: [],
    resetRequests: [],
    auditLog: [],
    mensagens: [],
    leads: [],
    reps: [],
    clientes: [],
    comissoes: [],
    entregas: [],
    orcamentos: [],
    campanhas: [],
    solicitacoesMkt: [],
    repositorioMkt: [],
    comunicados: [],
  };

  function _logAction(action, target, details) {
    const u = _state.currentUser;
    const entry = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      timestamp: new Date().toISOString(),
      userId:    u?.id    || 'sistema',
      userName:  u?.nome  || 'Sistema',
      userLogin: u?.login || '—',
      action, target: target||'', details: details||'',
    };
    _state.auditLog.unshift(entry);
    if (_state.auditLog.length > 2000) _state.auditLog = _state.auditLog.slice(0, 2000);
    _apiCreate('auditLog', entry);
  }

  function _isRestricted() {
    const u = _state.currentUser;
    return u && u.role !== 'master' && u.role !== 'adm_geral' && !!u.repId;
  }

  async function _loadFromAPI() {
    const [users, resetRequests, auditLog, mensagens, leads, reps, clientes, comissoes, entregas, orcamentos, campanhas, solicitacoesMkt, repositorioMkt, comunicados] = await Promise.all([
      _apiList('users'), _apiList('resetRequests'), _apiList('auditLog'), _apiList('mensagens'),
      _apiList('leads'), _apiList('reps'), _apiList('clientes'), _apiList('comissoes'),
      _apiList('entregas'), _apiList('orcamentos'), _apiList('campanhas'), _apiList('solicitacoesMkt'),
      _apiList('repositorioMkt'), _apiList('comunicados'),
    ]);
    _state.users = users;
    _state.resetRequests = resetRequests;
    _state.auditLog = auditLog;
    _state.mensagens = mensagens;
    _state.leads = leads;
    _state.reps = reps;
    _state.clientes = clientes;
    _state.comissoes = comissoes;
    _state.entregas = entregas;
    _state.orcamentos = orcamentos;
    _state.campanhas = campanhas;
    _state.solicitacoesMkt = solicitacoesMkt;
    _state.repositorioMkt = repositorioMkt;
    _state.comunicados = comunicados;

    // Restaura sessão entre reloads de página (token simples = id do usuário)
    try {
      const savedUserId = localStorage.getItem('friomac_session');
      if (savedUserId) {
        const u = _state.users.find(x => x.id === savedUserId && x.ativo);
        if (u) _state.currentUser = u;
        else localStorage.removeItem('friomac_session');
      }
    } catch(e) {}
  }

  // ── PUBLIC API ───────────────────────────────────────
  return {
    async init() { await _loadFromAPI(); },

    // ── AUTH ─────────────────────────────────────────
    login(identifier, senha) {
      const id = (identifier||'').toLowerCase().trim();
      const u = _state.users.find(u =>
        u.ativo &&
        ((u.email||'').toLowerCase() === id || (u.login||'').toLowerCase() === id) &&
        u.senha === senha
      );
      if (u) {
        _state.currentUser = u;
        try { localStorage.setItem('friomac_session', u.id); } catch(e) {}
        _logAction('LOGIN', u.login, `Acesso via ${id.includes('@')?'email':'login'}`);
        return u;
      }
      return null;
    },
    logout() {
      if (_state.currentUser) _logAction('LOGOUT', _state.currentUser.login, '');
      _state.currentUser = null;
      try { localStorage.removeItem('friomac_session'); } catch(e) {}
    },
    getUser()       { return _state.currentUser; },
    getUsers()      { return [..._state.users]; },

    // ── USER MANAGEMENT ──────────────────────────────
    getSystemUsers()    { return [..._state.users]; },
    getUserById(id)     { return _state.users.find(u => u.id === id); },
    getMenuLabels()     { return MENU_LABELS; },
    getRoleLabels()     { return ROLE_LABELS; },
    getCargos()         { return CARGOS; },

    addSystemUser(data) {
      const u = {
        id: 'u_' + Date.now(),
        ativo: true,
        senhaTemporaria: true,
        dataCadastro: new Date().toISOString().split('T')[0],
        menuPermissoes: [],
        tipoAcesso: {},
        grupo: 'Equipe',
        ...data,
        avatar: this.getInitials(data.nome),
      };
      _state.users.push(u);
      _logAction('USER_CRIADO', u.login, `Nome: ${u.nome} | Perfil: ${u.role}`);
      _apiCreate('users', u);
      return u;
    },

    updateSystemUser(id, updates) {
      const idx = _state.users.findIndex(u => u.id === id);
      if (idx >= 0) {
        _state.users[idx] = { ..._state.users[idx], ...updates };
        _apiUpdate('users', id, _state.users[idx]);
        return _state.users[idx];
      }
      return null;
    },

    deleteSystemUser(id) {
      const u = _state.users.find(x => x.id === id);
      _logAction('USER_EXCLUIDO', u?.login||id, `Nome: ${u?.nome||'?'}`);
      _state.users = _state.users.filter(u => u.id !== id);
      _apiDelete('users', id);
    },

    changeUserPassword(id, novaSenha, isTemp = false) {
      const u = _state.users.find(x => x.id === id);
      _logAction('SENHA_ALTERADA', u?.login||id, isTemp?'Senha temporária definida':'Senha alterada pelo usuário');
      return this.updateSystemUser(id, { senha: novaSenha, senhaTemporaria: isTemp });
    },

    // ── RESET REQUESTS ──────────────────────────────
    addResetRequest(data) {
      const req = {
        id: 'rreq_' + Date.now(),
        dataSolicita: new Date().toISOString().split('T')[0],
        status: 'pendente',
        ...data,
      };
      _state.resetRequests.push(req);
      _apiCreate('resetRequests', req);
      return req;
    },

    getResetRequests() { return [..._state.resetRequests]; },

    resolveResetRequest(reqId, novaSenha, aprovadoPorId) {
      const req = _state.resetRequests.find(r => r.id === reqId);
      if (!req) return;
      this.changeUserPassword(req.userId, novaSenha, true);
      const idx = _state.resetRequests.findIndex(r => r.id === reqId);
      if (idx >= 0) {
        _state.resetRequests[idx] = { ..._state.resetRequests[idx], status:'aprovado', aprovadoPor:aprovadoPorId, dataResolucao: new Date().toISOString().split('T')[0] };
        _apiUpdate('resetRequests', reqId, _state.resetRequests[idx]);
      }
    },

    rejectResetRequest(reqId, aprovadoPorId) {
      const idx = _state.resetRequests.findIndex(r => r.id === reqId);
      if (idx >= 0) {
        _state.resetRequests[idx] = { ..._state.resetRequests[idx], status:'rejeitado', aprovadoPor:aprovadoPorId, dataResolucao: new Date().toISOString().split('T')[0] };
        _apiUpdate('resetRequests', reqId, _state.resetRequests[idx]);
      }
    },

    // ── AUDIT LOG ──────────────────────────────────
    getAuditLog(filters = {}) {
      let log = [..._state.auditLog];
      if (filters.userId) log = log.filter(e => e.userId === filters.userId);
      if (filters.action) log = log.filter(e => e.action.includes(filters.action.toUpperCase()));
      if (filters.search) {
        const q = filters.search.toLowerCase();
        log = log.filter(e =>
          (e.userName||'').toLowerCase().includes(q) ||
          (e.target||'').toLowerCase().includes(q) ||
          (e.details||'').toLowerCase().includes(q) ||
          (e.action||'').toLowerCase().includes(q)
        );
      }
      return log.slice(0, 500);
    },

    // ── MENSAGENS / NOTIFICAÇÕES ───────────────────
    getMensagens(userId) {
      if (!userId) return [];
      return _state.mensagens.filter(m => m.para === 'todos' || m.para === userId || m.de === userId);
    },

    getMensagensNaoLidas(userId) {
      return this.getMensagens(userId).filter(m => !(m.lidos||[]).includes(userId));
    },

    addMensagem(dados) {
      const m = {
        id: 'msg_' + Date.now(),
        dataEnvio: new Date().toISOString(),
        lidos: [],
        respostas: [],
        tipo: 'mensagem',
        ...dados,
      };
      _state.mensagens.unshift(m);
      _logAction('MSG_ENVIADA', dados.para, dados.titulo||'');
      _apiCreate('mensagens', m);
      return m;
    },

    marcarMensagemLida(msgId, userId) {
      const m = _state.mensagens.find(x => x.id === msgId);
      if (m && !(m.lidos||[]).includes(userId)) {
        m.lidos = [...(m.lidos||[]), userId];
        _apiUpdate('mensagens', msgId, m);
      }
    },

    responderMensagem(msgId, userId, userName, texto) {
      const m = _state.mensagens.find(x => x.id === msgId);
      if (m) {
        m.respostas = [...(m.respostas||[]), { userId, userName, texto, timestamp: new Date().toISOString() }];
        _logAction('MSG_RESPOSTA', msgId, `De: ${userName}`);
        _apiUpdate('mensagens', msgId, m);
      }
    },

    deleteMensagem(msgId) {
      _logAction('MSG_EXCLUIDA', msgId, '');
      _state.mensagens = _state.mensagens.filter(m => m.id !== msgId);
      _apiDelete('mensagens', msgId);
    },

    // ── PERFIS PRÉ-DEFINIDOS ───────────────────────
    getPerfis() { return PERFIS_PREDEFINIDOS; },

    // ── SCOPE ──────────────────────────────────────
    isUserRestricted() { return _isRestricted(); },
    getUserRepId()     { return _state.currentUser?.repId || null; },

    // ── UTILITIES ──────────────────────────────────
    generateLogin(nome) {
      const parts = (nome||'').trim()
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g,'')
        .replace(/[^a-z0-9\s]/g,'')
        .split(/\s+/).filter(Boolean);
      return parts.length >= 2 ? parts[0]+'.'+parts[1] : (parts[0]||'usuario');
    },

    generatePassword() {
      const s  = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      const sp = '@#!$';
      const base = Array.from({length:8}, ()=>s[Math.floor(Math.random()*s.length)]).join('');
      return base + sp[Math.floor(Math.random()*sp.length)] + (Math.floor(Math.random()*9)+1);
    },

    checkPermission(screen) {
      const u = _state.currentUser;
      if (!u || !u.ativo) return { access:false, edit:false };
      if (u.role === 'master')    return { access:true, edit:true };
      if (u.role === 'adm_geral') return { access:true, edit:true };
      if (screen === 'config')    return { access:false, edit:false };
      const ok = (u.menuPermissoes||[]).includes(screen);
      return { access:ok, edit:ok && (u.tipoAcesso||{})[screen]==='edicao' };
    },

    // Leads
    getLeads(filters = {}) {
      let list = [..._state.leads];

      if (_isRestricted()) {
        const repId = _state.currentUser.repId;
        list = list.filter(l => l.vendedor === repId);
      }

      if (filters.resultado === 'ganho') {
        list = list.filter(l => l.resultado === 'ganho');
      } else if (filters.resultado === 'perdido') {
        list = list.filter(l => l.resultado === 'perdido');
      } else if (!filters.incluirInativos) {
        list = list.filter(l => !l.resultado);
      }

      if (filters.etapa)      list = list.filter(l => l.etapa === filters.etapa);
      if (filters.canal)      list = list.filter(l => l.canal === filters.canal);
      if (filters.vendedor)   list = list.filter(l => l.vendedor === filters.vendedor);
      if (filters.prioridade) list = list.filter(l => l.prioridade === filters.prioridade);

      if (filters.ultimos30dias) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        list = list.filter(l => new Date(l.dataAbertura) >= cutoff);
      }

      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(l =>
          (l.cliente||'').toLowerCase().includes(q) ||
          (l.nomFantasia||'').toLowerCase().includes(q) ||
          (l.id||'').includes(q)
        );
      }
      return list;
    },
    getLeadById(id)  { return _state.leads.find(l => l.id === id); },

    updateLead(id, updates) {
      const idx = _state.leads.findIndex(l => l.id === id);
      if (idx >= 0) {
        _state.leads[idx] = { ..._state.leads[idx], ...updates };
        _apiUpdate('leads', id, _state.leads[idx]);
        return _state.leads[idx];
      }
      return null;
    },

    addLead(lead) {
      const newId = String(Math.max(..._state.leads.map(l => parseInt(l.id)||0), 0) + 1);
      const newLead = {
        id: newId,
        dataAbertura: new Date().toISOString().split('T')[0],
        etapa: 'novo_lead',
        status: 'EM ABERTO',
        prioridade: 'média',
        tags: [],
        diasAberto: 0,
        observacoes: [],
        anexos: [],
        resultado: null,
        ...lead,
      };
      _state.leads.unshift(newLead);
      _apiCreate('leads', newLead);
      return newLead;
    },

    deleteLead(id) {
      this.updateLead(id, { _excluido: true });
    },

    moveLeadToStage(id, etapa) {
      return this.updateLead(id, { etapa });
    },

    // ── OBSERVAÇÕES ──────────────────────────────────
    addObservacao(leadId, texto, user) {
      const lead = this.getLeadById(leadId);
      if (!lead) return null;
      const now = new Date();
      const obs = {
        id: 'obs_' + Date.now(),
        texto: texto.trim(),
        autorId:   user?.id   || 'u1',
        autorNome: user?.nome || 'Usuário',
        autorAvatar: user?.avatar || '??',
        timestamp: now.toISOString(),
        dataHora: now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }),
      };
      const observacoes = [...(lead.observacoes || []), obs];
      this.updateLead(leadId, { observacoes });
      return obs;
    },

    getObservacoes(leadId) {
      const lead = this.getLeadById(leadId);
      return lead?.observacoes || [];
    },

    // ── ANEXOS (base64 guardado junto do registro, persistido no Postgres) ──
    addAnexo(leadId, fileInfo) {
      const lead = this.getLeadById(leadId);
      if (!lead) return null;
      const anexo = {
        id: 'anx_' + Date.now(),
        nome:      fileInfo.nome,
        tipo:      fileInfo.tipo,
        tamanho:   fileInfo.tamanho,
        autorNome: fileInfo.autorNome || 'Usuário',
        timestamp: new Date().toISOString(),
        dataAnexo: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
        base64:    fileInfo.base64 || null,
      };
      const anexos = [...(lead.anexos || []), anexo];
      this.updateLead(leadId, { anexos });
      return anexo;
    },

    getAnexoData(leadId, anexoId) {
      const lead = this.getLeadById(leadId);
      return lead?.anexos?.find(a => a.id === anexoId)?.base64 || null;
    },

    removeAnexo(leadId, anexoId) {
      const lead = this.getLeadById(leadId);
      if (!lead) return;
      const anexos = (lead.anexos || []).filter(a => a.id !== anexoId);
      this.updateLead(leadId, { anexos });
    },

    // ── RESULTADOS — GANHO / PERDIDO ─────────────────
    concluirVenda(leadId, dados = {}) {
      const lead = this.getLeadById(leadId);
      if (!lead) return;

      const precoFinal  = dados.precoFinal  || lead.valor;
      const vendedorId  = dados.vendedor    || lead.vendedor;
      const vendedorRep = vendedorId ? this.getRepById(vendedorId) : null;

      this.updateLead(leadId, {
        resultado:      'ganho',
        etapa:          'decisao_final',
        status:         'GANHO',
        dataFechamento: new Date().toISOString().split('T')[0],
        valorFinal:     precoFinal,
        formaPagamento: dados.formaPagamento || '',
        vendedor:       vendedorId || lead.vendedor,
      });

      this.addEntrega({
        norcamento:      leadId,
        cliente:         lead.nomFantasia || lead.cliente,
        vendedor:        vendedorRep?.nome || vendedorId || '—',
        dataPedido:      new Date().toISOString().split('T')[0],
        dataPrevEntrega: dados.dataPrevEntrega || '',
        dataRealEntrega: null,
        statusEntrega:   'EM PRODUCAO',
        multaDia:        dados.multaDia || 0,
        multaTotal:      0,
        diasAtraso:      0,
        satisfacao:      5,
        valorContrato:   precoFinal,
        formaPagamento:  dados.formaPagamento || '',
        obs:             `Venda concretizada. Pgto: ${dados.formaPagamento || 'não informado'}`,
      });

      if (vendedorId) {
        const pct    = dados.pct       || vendedorRep?.comissao || 5;
        const comVal = dados.valorComissao != null ? dados.valorComissao : (precoFinal * pct / 100);
        this.addComissao({
          vendedor:   vendedorRep?.nome || vendedorId,
          norcamento: leadId,
          cliente:    lead.nomFantasia || lead.cliente,
          valorOrc:   precoFinal,
          pct,
          valorCom:   comVal,
          statusPgto: 'PENDENTE',
          dataPgto:   null,
          obs:        `Forma pgto: ${dados.formaPagamento || ''}. Gerado ao concluir venda.`,
        });
      }

      return lead;
    },

    marcarPerdido(leadId, motivo = '') {
      return this.updateLead(leadId, {
        resultado:     'perdido',
        etapa:         'decisao_final',
        status:        'PERDIDO',
        motivoPerda:   motivo,
        dataFechamento: new Date().toISOString().split('T')[0],
      });
    },

    reativarLead(leadId) {
      return this.updateLead(leadId, {
        resultado:     null,
        status:        'EM ABERTO',
        etapa:         'novo_lead',
        motivoPerda:   null,
        motivoGanho:   null,
        dataFechamento: null,
      });
    },

    // Reps
    getReps() {
      if (_isRestricted()) {
        const repId = _state.currentUser.repId;
        return _state.reps.filter(r => r.id === repId);
      }
      return [..._state.reps];
    },
    getRepById(id)  { return _state.reps.find(r => r.id === id); },
    getRepByNome(n) { return _state.reps.find(r => r.nome.toLowerCase().includes((n||'').toLowerCase())); },

    updateRep(id, updates) {
      const idx = _state.reps.findIndex(r => r.id === id);
      if (idx >= 0) {
        _state.reps[idx] = { ..._state.reps[idx], ...updates };
        _apiUpdate('reps', id, _state.reps[idx]);
        return _state.reps[idx];
      }
      return null;
    },

    addRep(rep) {
      const newRep = { id: 'r' + Date.now(), qtdOrc: 0, totalOrc: 0, fechados: 0, totalFech: 0, ativo: true, anexos: [], ...rep };
      _state.reps.push(newRep);
      _apiCreate('reps', newRep);
      return newRep;
    },

    inativarRep(id) { return this.updateRep(id, { ativo: false }); },
    ativarRep(id)   { return this.updateRep(id, { ativo: true });  },

    // Rep Anexos
    addRepAnexo(repId, fileInfo) {
      const rep = this.getRepById(repId);
      if (!rep) return null;
      const anexo = {
        id: 'ranx_' + Date.now(),
        nome: fileInfo.nome, tipo: fileInfo.tipo, tamanho: fileInfo.tamanho,
        categoria: fileInfo.categoria || 'outro',
        autorNome: fileInfo.autorNome || 'Usuário',
        timestamp: new Date().toISOString(),
        dataAnexo: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
        base64: fileInfo.base64 || null,
      };
      const anexos = [...(rep.anexos || []), anexo];
      this.updateRep(repId, { anexos });
      return anexo;
    },
    getRepAnexoData(repId, anexoId) {
      const rep = this.getRepById(repId);
      return rep?.anexos?.find(a => a.id === anexoId)?.base64 || null;
    },
    removeRepAnexo(repId, anexoId) {
      const rep = this.getRepById(repId);
      if (!rep) return;
      this.updateRep(repId, { anexos: (rep.anexos||[]).filter(a => a.id !== anexoId) });
    },

    // ── CAMPANHAS ──────────────────────────────────
    getCampanhas()    { return [..._state.campanhas]; },
    addCampanha(c) {
      const nc = { id: 'camp_'+Date.now(), dataCriacao: new Date().toISOString().split('T')[0], status:'ativa', ...c };
      _state.campanhas.push(nc); _apiCreate('campanhas', nc); return nc;
    },
    updateCampanha(id, upd) {
      const i = _state.campanhas.findIndex(c=>c.id===id);
      if(i>=0){ _state.campanhas[i]={..._state.campanhas[i],...upd}; _apiUpdate('campanhas', id, _state.campanhas[i]); return _state.campanhas[i]; }
    },
    deleteCampanha(id) {
      _state.campanhas = _state.campanhas.filter(c=>c.id!==id); _apiDelete('campanhas', id);
    },

    // ── SOLICITAÇÕES MKT ───────────────────────────
    getSolicitacoesMkt()  { return [..._state.solicitacoesMkt]; },
    addSolicitacaoMkt(s) {
      const ns = { id: 'smkt_'+Date.now(), dataSolicita: new Date().toISOString().split('T')[0], status:'pendente', ...s };
      _state.solicitacoesMkt.push(ns); _apiCreate('solicitacoesMkt', ns); return ns;
    },
    updateSolicitacaoMkt(id, upd) {
      const i = _state.solicitacoesMkt.findIndex(s=>s.id===id);
      if(i>=0){ _state.solicitacoesMkt[i]={..._state.solicitacoesMkt[i],...upd}; _apiUpdate('solicitacoesMkt', id, _state.solicitacoesMkt[i]); }
    },

    // ── REPOSITÓRIO MKT ────────────────────────────
    getRepositorioMkt()   { return [..._state.repositorioMkt]; },
    addItemRepo(item) {
      const ni = { id: 'repo_'+Date.now(), dataUpload: new Date().toISOString().split('T')[0], ...item };
      _state.repositorioMkt.push(ni); _apiCreate('repositorioMkt', ni); return ni;
    },
    removeItemRepo(id) {
      _state.repositorioMkt = _state.repositorioMkt.filter(i=>i.id!==id); _apiDelete('repositorioMkt', id);
    },
    getRepoItemData(id) {
      const item = _state.repositorioMkt.find(i=>i.id===id);
      return item?.base64 || null;
    },

    // ── COMUNICADOS ────────────────────────────────
    getComunicados()   { return [..._state.comunicados]; },
    addComunicado(c) {
      const nc = { id: 'com_'+Date.now(), dataEnvio: new Date().toISOString().split('T')[0], lidos:[], ...c };
      _state.comunicados.push(nc); _apiCreate('comunicados', nc); return nc;
    },
    markComunicadoLido(comId, repId) {
      const i = _state.comunicados.findIndex(c=>c.id===comId);
      if(i>=0 && !_state.comunicados[i].lidos.includes(repId)){
        _state.comunicados[i].lidos.push(repId); _apiUpdate('comunicados', comId, _state.comunicados[i]);
      }
    },
    deleteComunicado(id) { _state.comunicados=_state.comunicados.filter(c=>c.id!==id); _apiDelete('comunicados', id); },

    // Clientes
    getClientes(q = '') {
      let list = [..._state.clientes];
      if (q) {
        const ql = q.toLowerCase();
        list = list.filter(c =>
          (c.nomeFantasia||'').toLowerCase().includes(ql) ||
          (c.nomeCliente||'').toLowerCase().includes(ql) ||
          (c.email||'').toLowerCase().includes(ql)
        );
      }
      return list;
    },
    addCliente(c) {
      const nc = { id: 'c' + Date.now(), dataCadastro: new Date().toISOString().split('T')[0], qtdOrcamentos: 0, totalOrcado: 0, ativo: true, ...c };
      _state.clientes.push(nc);
      _apiCreate('clientes', nc);
      return nc;
    },
    updateCliente(id, updates) {
      const idx = _state.clientes.findIndex(c => c.id === id);
      if (idx >= 0) { _state.clientes[idx] = {..._state.clientes[idx], ...updates}; _apiUpdate('clientes', id, _state.clientes[idx]); }
    },
    deleteCliente(id) {
      _state.clientes = _state.clientes.filter(c => c.id !== id);
      _apiDelete('clientes', id);
    },

    // Comissões
    getComissoes(filtros = {}) {
      let list = [..._state.comissoes];
      if (_isRestricted()) {
        const repId = _state.currentUser.repId;
        list = list.filter(c => c.vendedorId === repId || c.vendedor === repId);
      }
      if (filtros.vendedor) list = list.filter(c => c.vendedor === filtros.vendedor || (c.vendedorId && c.vendedorId === filtros.vendedor));
      if (filtros.canal)    list = list.filter(c => c.canal === filtros.canal);
      if (filtros.periodo) {
        const hoje = new Date(); const dias = filtros.periodo === '30' ? 30 : filtros.periodo === '12m' ? 365 : 0;
        if (dias) list = list.filter(c => { const d = new Date(c.dataCadastro||c.dataFechamento||''); return (hoje-d)/(86400000) <= dias; });
      }
      return list;
    },
    addComissao(c) {
      const nc = { id: 'com_' + Date.now(), dataCadastro: new Date().toISOString().split('T')[0], statusPgto: 'PENDENTE', ...c };
      _state.comissoes.push(nc);
      _apiCreate('comissoes', nc);
      return nc;
    },
    updateComissao(id, updates) {
      const idx = _state.comissoes.findIndex(c => c.id === id);
      if (idx >= 0) { _state.comissoes[idx] = {..._state.comissoes[idx], ...updates}; _apiUpdate('comissoes', id, _state.comissoes[idx]); return _state.comissoes[idx]; }
    },
    getComissaoById(id) { return _state.comissoes.find(c => c.id === id); },
    setComissaoComprovante(comId, base64) {
      this.updateComissao(comId, { comprovanteBase64: base64 });
    },
    getComissaoComprovante(comId) {
      return this.getComissaoById(comId)?.comprovanteBase64 || null;
    },

    // Entregas
    getEntregas() { return [..._state.entregas]; },
    addEntrega(e) {
      const ne = { id: 'ent_' + Date.now(), diasAtraso: 0, statusEntrega: 'NO PRAZO', satisfacao: 5, ...e };
      _state.entregas.push(ne);
      _apiCreate('entregas', ne);
      return ne;
    },
    updateEntrega(id, updates) {
      const idx = _state.entregas.findIndex(e => e.id === id);
      if (idx >= 0) { _state.entregas[idx] = {..._state.entregas[idx], ...updates}; _apiUpdate('entregas', id, _state.entregas[idx]); }
    },

    // Orçamentos
    getOrcamentos() { return [..._state.orcamentos]; },
    addOrcamento(o) {
      const no = { id: 'orc_' + Date.now(), data: new Date().toISOString().split('T')[0], status: 'EM ABERTO', ...o };
      _state.orcamentos.push(no);
      _apiCreate('orcamentos', no);
      return no;
    },

    // Computed
    getKPIs() {
      const leads = _state.leads;
      const ativos  = leads.filter(l => !l.resultado);
      const ganhos  = leads.filter(l => l.resultado === 'ganho');
      const perdidos = leads.filter(l => l.resultado === 'perdido');
      const totalOrc  = ativos.reduce((s, l) => s + (l.valor||0), 0);
      const totalFech = ganhos.reduce((s, l) => s + (l.valor||0), 0);
      const totalPerd = perdidos.reduce((s, l) => s + (l.valor||0), 0);
      const totalLeads = ativos.length + ganhos.length + perdidos.length;
      const taxa = totalLeads ? (ganhos.length / totalLeads * 100).toFixed(1) : 0;
      const ticket = ganhos.length ? (totalFech / ganhos.length) : 0;
      return {
        ...KPIS,
        totalOrcado:    totalOrc,
        totalFechado:   totalFech,
        totalPerdido:   totalPerd,
        qtdOrcamentos:  ativos.length,
        qtdFechados:    ganhos.length,
        qtdPerdidos:    perdidos.length,
        taxaConversao:  parseFloat(taxa),
        ticketMedio:    ticket,
      };
    },

    getFunnelData() {
      const leads = _state.leads.filter(l => !l.resultado);
      return STAGES.map(s => {
        const items = leads.filter(l => l.etapa === s.id);
        const total = items.reduce((sum, l) => sum + (l.valor||0), 0);
        return { ...s, count: items.length, total };
      });
    },

    getStages()  { return STAGES; },
    getStageById(id) { return STAGES.find(s => s.id === id); },

    formatCurrency(v) {
      if (!v && v !== 0) return '—';
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
    },

    formatDate(d) {
      if (!d) return '—';
      const dt = typeof d === 'string' ? new Date(d + 'T12:00:00') : d;
      return dt.toLocaleDateString('pt-BR');
    },

    getInitials(name) {
      if (!name) return '?';
      return name.trim().split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase();
    },

    getPrioridadeBadge(p) {
      const map = { alta: 'badge-danger', média: 'badge-warning', baixa: 'badge-success' };
      return map[p] || 'badge-gray';
    },

    getSLAStatus(lead) {
      if (lead.diasAberto > 90) return 'sla-late';
      if (lead.diasAberto > 30) return 'sla-warning';
      return 'sla-ok';
    },

    async resetData() {
      await _loadFromAPI();
    },
  };
})();
