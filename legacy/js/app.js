/* =====================================================
   FRIOMAC CRM — Application Core
   ===================================================== */

const App = (function() {
  let _currentScreen = 'dashboard';
  let _sidebarCollapsed = false;
  let _dragSrcLead = null;
  let _kanbanFilter = { search: '', canal: '', vendedor: '', prioridade: '', etapaUnica: '', periodo: '', resultado: '' };

  // ── TOAST ──────────────────────────────────────────
  function toast(msg, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    t.innerHTML = `<span style="font-size:1.1rem">${icons[type]||'ℹ'}</span> ${msg}`;
    container.appendChild(t);
    setTimeout(() => {
      t.style.animation = 'fadeOut .3s ease forwards';
      setTimeout(() => t.remove(), 300);
    }, duration);
  }

  // ── AUTH ───────────────────────────────────────────
  function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').classList.add('hidden');
  }

  function hideLogin() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').classList.remove('hidden');
  }

  function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;
    if (!email || !senha) { toast('Preencha email e senha.', 'warning'); return; }
    const user = FriomacData.login(email, senha);
    if (user) {
      hideLogin();
      updateUserUI(user);
      navigateTo('dashboard');
      toast(`Bem-vindo, ${user.nome.split(' ')[0]}!`, 'success');
    } else {
      toast('Email ou senha incorretos.', 'error');
    }
  }

  function quickLogin(email) {
    document.getElementById('login-email').value = email;
    document.getElementById('login-senha').value = email === 'admin@friomac.ind.br' ? 'admin123' : '123456';
  }

  function handleLogout() {
    FriomacData.logout();
    showLogin();
    toast('Sessão encerrada.', 'info');
  }

  function updateUserUI(user) {
    const u = user || FriomacData.getUser();
    if (!u) return;
    document.querySelectorAll('.user-avatar').forEach(el => el.textContent = u.avatar || FriomacData.getInitials(u.nome));
    document.querySelectorAll('.user-name').forEach(el => el.textContent = u.nome.split(' ').slice(0,2).join(' '));
    document.querySelectorAll('.user-role').forEach(el => el.textContent = { master: 'Administrador', vendedor: 'Vendedor', representante: 'Representante' }[u.role] || u.role);
    document.querySelectorAll('.header-user-name').forEach(el => el.textContent = u.nome.split(' ')[0]);
  }

  // ── NAVIGATION ─────────────────────────────────────
  function navigateTo(screen) {
    _currentScreen = screen;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.screen === screen);
    });
    document.querySelectorAll('.screen').forEach(el => {
      el.classList.toggle('active', el.id === 'screen-' + screen);
    });
    const titles = {
      dashboard:  { title: 'Dashboard',              sub: 'Visão geral comercial 2026' },
      kanban:     { title: 'Gestão de Leads — Kanban', sub: 'Funil de vendas visual' },
      clientes:   { title: 'Clientes',               sub: 'Cadastro e gestão de clientes' },
      orcamentos: { title: 'Orçamentos',              sub: 'Controle de propostas e orçamentos' },
      vendedores: { title: 'Vendedores & Representantes', sub: 'Equipe comercial' },
      campanhas:  { title: 'Campanhas & Mídias',       sub: 'Campanhas, materiais e comunicados' },
      comissoes:  { title: 'Comissões',               sub: 'Controle de comissões e pagamentos' },
      prazo:      { title: 'Prazo de Entrega',        sub: 'Controle de entregas e garantias' },
      config:     { title: 'Configurações',           sub: 'Sistema e integrações' },
    };
    const t = titles[screen] || { title: screen, sub: '' };
    document.getElementById('page-title').textContent    = t.title;
    document.getElementById('page-subtitle').textContent = t.sub;

    renderScreen(screen);
  }

  function renderScreen(screen) {
    switch(screen) {
      case 'dashboard':  renderDashboard(); break;
      case 'kanban':     renderKanban();    break;
      case 'clientes':   renderClientes();  break;
      case 'orcamentos': renderOrcamentos(); break;
      case 'vendedores': renderVendedores(); break;
      case 'campanhas':  renderCampanhas();  break;
      case 'comissoes':  renderComissoes();  break;
      case 'prazo':      renderPrazo();      break;
      case 'config':     renderConfig();     break;
    }
  }

  // ── SIDEBAR TOGGLE ──────────────────────────────────
  function toggleSidebar() {
    _sidebarCollapsed = !_sidebarCollapsed;
    document.querySelector('.sidebar').classList.toggle('collapsed', _sidebarCollapsed);
    document.querySelector('.main-content').classList.toggle('expanded', _sidebarCollapsed);
  }

  // ══════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════
  function renderDashboard() {
    const kpis    = FriomacData.getKPIs();
    const funnel  = FriomacData.getFunnelData();
    const leads   = FriomacData.getLeads();
    const fmt     = FriomacData.formatCurrency.bind(FriomacData);
    const fmtDate = FriomacData.formatDate.bind(FriomacData);

    const totalOrcado = leads.reduce((s,l)=>s+(l.valor||0),0);
    const altaPrioridade = leads.filter(l=>l.prioridade==='alta').length;
    const metaPercent = (kpis.totalFechado / kpis.metaAnual * 100).toFixed(1);
    const pipelineMax = Math.max(...funnel.map(f=>f.total), 1);

    // Monthly chart bars
    const maxOrc = Math.max(...kpis.mensal.map(m=>m.totalOrc), 1);
    const monthBars = kpis.mensal.map(m => {
      const h = Math.round((m.totalOrc / maxOrc) * 100);
      return `<div class="mini-bar" style="height:${h}%;background:${h>50?'var(--primary)':'var(--primary-light)'}" title="${m.mes}: ${fmt(m.totalOrc)}"></div>`;
    }).join('');

    // Recent leads (last 6)
    const recents = [...leads].sort((a,b) => new Date(b.dataAbertura)-new Date(a.dataAbertura)).slice(0,6);

    document.getElementById('screen-dashboard').innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card blue">
        <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
        <div class="kpi-value">${fmt(totalOrcado)}</div>
        <div class="kpi-label">Pipeline Total em Aberto</div>
        <div class="kpi-delta neutral">▶ ${kpis.qtdOrcamentos} orçamentos</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div class="kpi-value">${fmt(kpis.totalFechado)}</div>
        <div class="kpi-label">Receita Fechada 2026</div>
        <div class="kpi-delta ${kpis.totalFechado>0?'up':'neutral'}">${kpis.qtdFechados} contratos</div>
      </div>
      <div class="kpi-card orange">
        <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
        <div class="kpi-value">${kpis.taxaConversao}%</div>
        <div class="kpi-label">Taxa de Conversão</div>
        <div class="kpi-delta neutral">Meta: ${kpis.metas.taxaConversao}%</div>
      </div>
      <div class="kpi-card purple">
        <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
        <div class="kpi-value">${kpis.vendedoresAtivos}</div>
        <div class="kpi-label">Vendedores Ativos</div>
        <div class="kpi-delta neutral">Canal próprio + Reps</div>
      </div>
      <div class="kpi-card teal">
        <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
        <div class="kpi-value">${altaPrioridade}</div>
        <div class="kpi-label">Alta Prioridade Hoje</div>
        <div class="kpi-delta ${altaPrioridade>5?'down':'up'}">Atenção necessária</div>
      </div>
      <div class="kpi-card red">
        <div class="kpi-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <div class="kpi-value">${leads.filter(l=>l.diasAberto>90).length}</div>
        <div class="kpi-label">Leads &gt;90 dias em aberto</div>
        <div class="kpi-delta down">Requer ação urgente</div>
      </div>
      <div class="kpi-card" style="border-top:3px solid var(--danger)">
        <div class="kpi-icon" style="color:var(--danger)">❌</div>
        <div class="kpi-value" style="color:var(--danger)">${kpis.qtdPerdidos || 0}</div>
        <div class="kpi-label">Clientes Perdidos</div>
        <div class="kpi-delta neutral">${fmt(kpis.totalPerdido || 0)} perdido</div>
      </div>
    </div>

    <!-- META ANUAL -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-body" style="padding:18px 22px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div>
            <div class="section-title">🎯 Meta Anual 2026</div>
            <div style="font-size:.78rem;color:var(--text-3);margin-top:2px">${fmt(kpis.totalFechado)} de ${fmt(kpis.metaAnual)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:1.4rem;font-weight:800;color:var(--primary)">${metaPercent}%</div>
            <div style="font-size:.75rem;color:var(--text-3)">atingido</div>
          </div>
        </div>
        <div class="progress-wrap" style="height:10px">
          <div class="progress-bar progress-orange" style="width:${Math.min(metaPercent,100)}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:.72rem;color:var(--text-3)">
          <span>Jan 2026</span><span>Faltam: ${fmt(kpis.metaAnual - kpis.totalFechado)}</span><span>Dez 2026</span>
        </div>
      </div>
    </div>

    <div class="charts-grid">
      <!-- FUNIL -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">🚀 Funil de Vendas</div>
          <span class="badge badge-primary">${kpis.qtdOrcamentos} leads</span>
        </div>
        <div class="card-body" style="padding:16px 18px">
          <div class="funnel-visual">
            ${funnel.map((f,i) => {
              const pct = Math.round((f.total / pipelineMax) * 100) || 2;
              const colors = ['#0EA5E9','#7C3AED','#0D9488','#D97706','#E8500A','#DC2626','#16A34A','#15803D'];
              return `
              <div class="funnel-row">
                <div class="funnel-label">${f.icon} ${f.label}</div>
                <div class="funnel-bar-wrap">
                  <div class="funnel-bar" style="width:${pct}%;background:${colors[i]}">
                    ${f.count > 0 ? f.count : ''}
                  </div>
                </div>
                <div class="funnel-count">${f.count}</div>
                <div class="funnel-value">${f.total > 0 ? fmt(f.total) : '—'}</div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- EVOLUÇÃO MENSAL -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">📅 Evolução Mensal</div>
          <span class="badge badge-info">2026</span>
        </div>
        <div class="card-body" style="padding:16px 18px">
          <div style="display:flex;align-items:flex-end;gap:6px;height:120px;margin-bottom:8px">
            ${kpis.mensal.map((m,i) => {
              const h = Math.round((m.totalOrc / maxOrc) * 100) || 0;
              const isActive = m.totalOrc > 0;
              return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer" title="${m.mes}: ${fmt(m.totalOrc)}">
                <div style="flex:1;width:100%;display:flex;align-items:flex-end">
                  <div style="width:100%;height:${Math.max(h,3)}%;background:${isActive?'var(--primary)':'var(--border)'};border-radius:3px 3px 0 0;transition:height .4s ease"></div>
                </div>
                <div style="font-size:.65rem;color:var(--text-3)">${m.mes}</div>
              </div>`;
            }).join('')}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding-top:12px;border-top:1px solid var(--border)">
            <div style="text-align:center">
              <div style="font-size:1rem;font-weight:800;color:var(--primary)">${kpis.mensal.filter(m=>m.totalOrc>0).length}</div>
              <div style="font-size:.72rem;color:var(--text-3)">Meses com atividade</div>
            </div>
            <div style="text-align:center">
              <div style="font-size:1rem;font-weight:800;color:var(--accent)">${fmt(totalOrcado)}</div>
              <div style="font-size:.72rem;color:var(--text-3)">Total em pipeline</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TOP LEADS + RECENT ACTIVITY -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <!-- TOP ORÇAMENTOS -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">💰 Maiores Orçamentos em Aberto</div>
          <button class="btn btn-ghost btn-sm" onclick="App.navigateTo('kanban')">Ver todos →</button>
        </div>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Cliente</th><th>Valor</th><th>Dias</th><th>Status</th></tr></thead>
            <tbody>
              ${[...leads].sort((a,b)=>(b.valor||0)-(a.valor||0)).slice(0,8).map(l=>`
              <tr style="cursor:pointer" onclick="App.openLeadModal('${l.id}')">
                <td><div style="font-weight:600;font-size:.82rem;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.nomFantasia||l.cliente}</div><div style="font-size:.7rem;color:var(--text-3)">#${l.id}</div></td>
                <td style="font-weight:700;color:var(--primary)">${fmt(l.valor)}</td>
                <td><span class="badge ${l.diasAberto>90?'badge-danger':l.diasAberto>30?'badge-warning':'badge-success'}">${l.diasAberto}d</span></td>
                <td><span class="badge badge-info" style="font-size:.65rem">${FriomacData.getStageById(l.etapa)?.icon||''} ${FriomacData.getStageById(l.etapa)?.label?.split(' ')[0]||l.etapa}</span></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- ATIVIDADE RECENTE -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">🔔 Últimos Leads Cadastrados</div>
          <button class="btn btn-ghost btn-sm" onclick="App.navigateTo('orcamentos')">Ver todos →</button>
        </div>
        <div class="card-body" style="padding:8px 16px">
          <div class="activity-list">
            ${recents.map(l => `
            <div class="activity-item" style="cursor:pointer" onclick="App.openLeadModal('${l.id}')">
              <div class="activity-dot" style="background:${l.prioridade==='alta'?'var(--danger)':l.prioridade==='média'?'var(--warning)':'var(--success)'}"></div>
              <div class="activity-content">
                <strong>${l.nomFantasia||l.cliente}</strong>
                <p>${fmt(l.valor)} · ${l.canal} · ${FriomacData.getStageById(l.etapa)?.label||l.etapa}</p>
              </div>
              <div class="activity-time">${fmtDate(l.dataAbertura)}</div>
            </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }

  // ══════════════════════════════════════════════════
  // KANBAN
  // ══════════════════════════════════════════════════
  function renderKanban() {
    const stages = FriomacData.getStages();
    const fmt    = FriomacData.formatCurrency.bind(FriomacData);

    const activeFilter = {
      search:       _kanbanFilter.search,
      canal:        _kanbanFilter.canal,
      vendedor:     _kanbanFilter.vendedor,
      prioridade:   _kanbanFilter.prioridade,
      etapa:        _kanbanFilter.etapaUnica || undefined,
      ultimos30dias: _kanbanFilter.periodo === '30dias',
    };

    const activeLeads  = FriomacData.getLeads(activeFilter);
    const ganhoLeads   = FriomacData.getLeads({ resultado: 'ganho',   search: _kanbanFilter.search });
    const perdidoLeads = FriomacData.getLeads({ resultado: 'perdido', search: _kanbanFilter.search });

    const showOnlyGanho   = _kanbanFilter.resultado === 'ganho';
    const showOnlyPerdido = _kanbanFilter.resultado === 'perdido';
    const showAll = !showOnlyGanho && !showOnlyPerdido;

    const displayedStages = showAll
      ? (_kanbanFilter.etapaUnica ? stages.filter(s => s.id === _kanbanFilter.etapaUnica) : stages)
      : [];

    const totalPipeline = activeLeads.reduce((s,l)=>s+(l.valor||0),0);
    const hasFilters = _kanbanFilter.search || _kanbanFilter.canal || _kanbanFilter.vendedor ||
                       _kanbanFilter.prioridade || _kanbanFilter.etapaUnica || _kanbanFilter.periodo ||
                       _kanbanFilter.resultado;

    document.getElementById('screen-kanban').innerHTML = `
    <div class="kanban-toolbar">
      <div class="search-bar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="kanban-search" placeholder="Buscar lead, cliente..." value="${_kanbanFilter.search||''}" oninput="App.kanbanFilter('search',this.value)">
      </div>

      <div style="position:relative">
        <button class="kanban-filter-btn ${hasFilters?'active':''}" onclick="App.toggleKanbanFilter()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          Filtros${hasFilters ? ' ●' : ''}
        </button>
        <div class="filter-dropdown" id="kanban-filter-panel">
          <div style="font-size:.73rem;font-weight:700;color:var(--text-3);letter-spacing:.05em;margin-bottom:8px">ETAPA DO FUNIL</div>
          <div class="filter-chips">
            <span class="filter-chip ${!_kanbanFilter.etapaUnica?'active':''}" onclick="App.kanbanFilter('etapaUnica','')">Todas</span>
            ${stages.map(s=>`<span class="filter-chip ${_kanbanFilter.etapaUnica===s.id?'active':''}" onclick="App.kanbanFilter('etapaUnica','${s.id}')">${s.icon} ${s.label.split(' ')[0]}</span>`).join('')}
          </div>
          <div style="font-size:.73rem;font-weight:700;color:var(--text-3);letter-spacing:.05em;margin:12px 0 8px">PERÍODO</div>
          <div class="filter-chips">
            <span class="filter-chip ${!_kanbanFilter.periodo?'active':''}" onclick="App.kanbanFilter('periodo','')">Todos</span>
            <span class="filter-chip ${_kanbanFilter.periodo==='30dias'?'active':''}" onclick="App.kanbanFilter('periodo','30dias')">Últimos 30 dias</span>
          </div>
          <div style="font-size:.73rem;font-weight:700;color:var(--text-3);letter-spacing:.05em;margin:12px 0 8px">RESULTADO</div>
          <div class="filter-chips">
            <span class="filter-chip ${!_kanbanFilter.resultado?'active':''}" onclick="App.kanbanFilter('resultado','')">Ativos</span>
            <span class="filter-chip chip-ganho ${_kanbanFilter.resultado==='ganho'?'active':''}" onclick="App.kanbanFilter('resultado','ganho')">🏆 Ganhos</span>
            <span class="filter-chip chip-perdido ${_kanbanFilter.resultado==='perdido'?'active':''}" onclick="App.kanbanFilter('resultado','perdido')">❌ Perdidos</span>
          </div>
          <div style="font-size:.73rem;font-weight:700;color:var(--text-3);letter-spacing:.05em;margin:12px 0 8px">CANAL</div>
          <div class="filter-chips">
            <span class="filter-chip ${!_kanbanFilter.canal?'active':''}" onclick="App.kanbanFilter('canal','')">Todos</span>
            <span class="filter-chip ${_kanbanFilter.canal==='CANAL PRÓPRIO'?'active':''}" onclick="App.kanbanFilter('canal','CANAL PRÓPRIO')">Canal Próprio</span>
            <span class="filter-chip ${_kanbanFilter.canal==='REPRESENTANTE'?'active':''}" onclick="App.kanbanFilter('canal','REPRESENTANTE')">Representante</span>
          </div>
          <div style="font-size:.73rem;font-weight:700;color:var(--text-3);letter-spacing:.05em;margin:12px 0 8px">PRIORIDADE</div>
          <div class="filter-chips">
            <span class="filter-chip ${!_kanbanFilter.prioridade?'active':''}" onclick="App.kanbanFilter('prioridade','')">Todas</span>
            <span class="filter-chip ${_kanbanFilter.prioridade==='alta'?'active':''}" onclick="App.kanbanFilter('prioridade','alta')">🔴 Alta</span>
            <span class="filter-chip ${_kanbanFilter.prioridade==='média'?'active':''}" onclick="App.kanbanFilter('prioridade','média')">🟡 Média</span>
            <span class="filter-chip ${_kanbanFilter.prioridade==='baixa'?'active':''}" onclick="App.kanbanFilter('prioridade','baixa')">🟢 Baixa</span>
          </div>
          ${hasFilters ? `<button class="btn btn-ghost btn-sm" style="width:100%;margin-top:12px" onclick="App.clearKanbanFilters()">Limpar todos os filtros</button>` : ''}
        </div>
      </div>

      <div style="margin-left:auto;display:flex;align-items:center;gap:10px">
        <span style="font-size:.8rem;color:var(--text-3)">${activeLeads.length} ativos · <strong style="color:var(--primary)">${fmt(totalPipeline)}</strong> · <span style="color:var(--success)">🏆 ${ganhoLeads.length}</span> · <span style="color:var(--danger)">❌ ${perdidoLeads.length}</span></span>
        <button class="btn btn-accent btn-sm" onclick="App.openNewLeadModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Lead
        </button>
      </div>
    </div>

    <div class="kanban-board" id="kanban-board">
      ${displayedStages.map((s,_) => {
        const i = stages.indexOf(s);
        const stageLeads = activeLeads.filter(l => l.etapa === s.id);
        const stageTotal = stageLeads.reduce((sum,l)=>sum+(l.valor||0),0);
        return `
        <div class="kanban-col col-stage-${i}" data-stage="${s.id}" id="col-${s.id}"
             ondragover="App.onDragOver(event)" ondrop="App.onDrop(event,'${s.id}')" ondragleave="App.onDragLeave(event)">
          <div class="kanban-col-header">
            <div class="kanban-col-title">
              <span>${s.icon}</span>${s.label}
              <span class="col-count">${stageLeads.length}</span>
            </div>
            <div class="col-total">${stageTotal > 0 ? fmt(stageTotal) : ''}</div>
          </div>
          <div class="kanban-col-body" id="body-${s.id}">
            ${stageLeads.length === 0
              ? `<div style="text-align:center;padding:20px 8px;color:var(--text-3);font-size:.74rem">Sem leads</div>`
              : stageLeads.map(l => renderKanbanCard(l, i)).join('')
            }
          </div>
        </div>`;
      }).join('')}

      ${(showAll || showOnlyGanho) ? `
      <div class="kanban-col col-ganho" data-stage="ganho" id="col-ganho"
           ondragover="App.onDragOver(event)" ondrop="App.onDrop(event,'ganho')" ondragleave="App.onDragLeave(event)">
        <div class="kanban-col-header">
          <div class="kanban-col-title">🏆 Concretizados <span class="col-count">${ganhoLeads.length}</span></div>
          <div class="col-total" style="color:var(--success)">${ganhoLeads.length > 0 ? fmt(ganhoLeads.reduce((s,l)=>s+(l.valor||0),0)) : ''}</div>
        </div>
        <div class="kanban-col-body" id="body-ganho">
          ${ganhoLeads.length === 0
            ? `<div style="text-align:center;padding:20px 8px;color:var(--text-3);font-size:.74rem">Nenhuma venda ainda</div>`
            : ganhoLeads.map(l => renderKanbanCard(l, -1, 'ganho')).join('')
          }
        </div>
      </div>` : ''}

      ${(showAll || showOnlyPerdido) ? `
      <div class="kanban-col col-perdido" data-stage="perdido" id="col-perdido"
           ondragover="App.onDragOver(event)" ondrop="App.onDrop(event,'perdido')" ondragleave="App.onDragLeave(event)">
        <div class="kanban-col-header">
          <div class="kanban-col-title">❌ Perdidos <span class="col-count">${perdidoLeads.length}</span></div>
          <div class="col-total" style="color:var(--danger)">${perdidoLeads.length > 0 ? fmt(perdidoLeads.reduce((s,l)=>s+(l.valor||0),0)) : ''}</div>
        </div>
        <div class="kanban-col-body" id="body-perdido">
          ${perdidoLeads.length === 0
            ? `<div style="text-align:center;padding:20px 8px;color:var(--text-3);font-size:.74rem">Nenhum lead perdido</div>`
            : perdidoLeads.map(l => renderKanbanCard(l, -2, 'perdido')).join('')
          }
        </div>
      </div>` : ''}
    </div>`;

    document.querySelectorAll('.kanban-card').forEach(initCardDrag);
    initKanbanScroll();
  }

  function renderKanbanCard(lead, stageIdx, resultado) {
    const fmt  = FriomacData.formatCurrency.bind(FriomacData);
    const sla  = resultado ? '' : FriomacData.getSLAStatus(lead);
    const rep  = lead.vendedor ? FriomacData.getRepById(lead.vendedor) : null;
    const prioClass = { alta: 'badge-danger', média: 'badge-warning', baixa: 'badge-success' }[lead.prioridade] || 'badge-gray';
    const borderColor = resultado === 'ganho' ? 'border-left:3px solid var(--success)' : resultado === 'perdido' ? 'border-left:3px solid var(--danger)' : '';

    return `
    <div class="kanban-card ${stageIdx >= 0 ? 'stage-'+stageIdx : ''}"
         id="card-${lead.id}" data-id="${lead.id}" data-stage="${lead.etapa}"
         draggable="true" style="${borderColor}" onclick="App.openLeadModal('${lead.id}')">
      ${sla ? `<div class="sla-indicator ${sla}"></div>` : ''}
      <div class="kanban-card-header">
        <div class="kanban-card-id">#${lead.id}</div>
        <div class="kanban-card-actions">
          ${resultado === 'ganho' ? '<span class="badge badge-success" style="font-size:.6rem;padding:2px 5px">GANHO</span>' : ''}
          ${resultado === 'perdido' ? '<span class="badge badge-danger" style="font-size:.6rem;padding:2px 5px">PERDIDO</span>' : ''}
          ${!resultado ? `
          <button class="card-action-btn" title="Avançar etapa" onclick="event.stopPropagation();App.advanceLead('${lead.id}')">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>` : `
          <button class="card-action-btn" title="Reativar lead" onclick="event.stopPropagation();App.reativarLead('${lead.id}')" style="color:var(--primary)">↩</button>`}
        </div>
      </div>
      <div class="kanban-card-title">${lead.nomFantasia || lead.cliente}</div>
      ${lead.nomeCliente ? `<div style="font-size:.72rem;color:var(--text-3);margin-bottom:4px">${lead.nomeCliente}</div>` : ''}
      <div class="kanban-card-value">${fmt(lead.valor)}</div>
      <div class="kanban-card-meta">
        <span class="badge ${prioClass}" style="font-size:.65rem">${lead.prioridade}</span>
        <span class="badge badge-gray" style="font-size:.65rem">${lead.canal==='REPRESENTANTE'?'Rep.':'Próprio'}</span>
        ${lead.diasAberto > 90 ? `<span class="badge badge-danger" style="font-size:.65rem">⚠ ${lead.diasAberto}d</span>` : ''}
      </div>
      <div class="kanban-card-footer">
        <div class="kanban-card-rep">
          ${rep ? `<div style="width:18px;height:18px;border-radius:50%;background:var(--primary);color:white;font-size:.6rem;font-weight:700;display:flex;align-items:center;justify-content:center">${FriomacData.getInitials(rep.nome)}</div> ${rep.nome.split(' ')[0]}` : '<span style="color:var(--text-3)">Não atribuído</span>'}
        </div>
        <div class="kanban-card-date">${FriomacData.formatDate(lead.dataAbertura)}</div>
      </div>
    </div>`;
  }

  function initCardDrag(card) {
    card.addEventListener('dragstart', e => {
      _dragSrcLead = card.dataset.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.dataset.id);
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.kanban-col-body').forEach(b => b.classList.remove('drag-over'));
    });
  }

  // ── KANBAN DRAG ───────────────────────────────────
  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const col = e.currentTarget;
    col.querySelector('.kanban-col-body')?.classList.add('drag-over');
  }

  function onDragLeave(e) {
    e.currentTarget.querySelector('.kanban-col-body')?.classList.remove('drag-over');
  }

  function onDrop(e, stage) {
    e.preventDefault();
    e.currentTarget.querySelector('.kanban-col-body')?.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain') || _dragSrcLead;
    if (!id) return;
    const lead = FriomacData.getLeadById(id);
    if (!lead) return;

    if (stage === 'ganho') {
      if (lead.resultado === 'ganho') return;
      showOutcomeDialog(id);
      return;
    }
    if (stage === 'perdido') {
      if (lead.resultado === 'perdido') return;
      showOutcomeDialog(id);
      return;
    }
    if (lead.resultado) {
      FriomacData.reativarLead(id);
      FriomacData.moveLeadToStage(id, stage);
      toast(`Lead #${id} reativado em "${FriomacData.getStageById(stage)?.label || stage}"`, 'success');
      renderKanban();
      return;
    }
    if (lead.etapa === stage) return;
    FriomacData.moveLeadToStage(id, stage);
    toast(`Lead #${id} movido para "${FriomacData.getStageById(stage)?.label || stage}"`, 'success');
    renderKanban();
  }

  function kanbanFilter(key, value) {
    _kanbanFilter[key] = value;
    renderKanban();
  }

  function toggleKanbanFilter() {
    document.getElementById('kanban-filter-panel')?.classList.toggle('open');
  }

  function clearKanbanFilters() {
    _kanbanFilter = { search: '', canal: '', vendedor: '', prioridade: '', etapaUnica: '', periodo: '', resultado: '' };
    renderKanban();
  }

  function initKanbanScroll() {
    const board = document.getElementById('kanban-board');
    if (!board) return;
    board.onwheel = null;
    board.addEventListener('wheel', function(e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        board.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }

  function advanceLead(id) {
    const lead   = FriomacData.getLeadById(id);
    if (!lead) return;
    if (lead.resultado) { toast('Este lead já tem resultado final. Reative-o para movê-lo.', 'warning'); return; }
    const stages = FriomacData.getStages();
    const idx    = stages.findIndex(s => s.id === lead.etapa);
    if (idx < stages.length - 1) {
      const next = stages[idx + 1];
      FriomacData.moveLeadToStage(id, next.id);
      toast(`Lead #${id} avançado para "${next.label}"`, 'success');
      renderKanban();
    } else {
      showOutcomeDialog(id);
    }
  }

  // ══════════════════════════════════════════════════
  // LEAD MODAL
  // ══════════════════════════════════════════════════
  function renderObsTimeline(lead) {
    const obs = lead.observacoes || [];
    if (!obs.length) return `<div style="text-align:center;padding:30px;color:var(--text-3);font-size:.82rem">Nenhuma observação ainda. Seja o primeiro a registrar!</div>`;
    return [...obs].reverse().map(o => `
      <div class="obs-item">
        <div class="obs-avatar-sm">${o.autorAvatar || '??'}</div>
        <div class="obs-bubble">
          <div class="obs-meta">
            <strong>${o.autorNome}</strong>
            <span class="obs-timestamp">${o.dataHora}</span>
          </div>
          <p style="margin:0;font-size:.85rem;line-height:1.5;white-space:pre-wrap">${o.texto.replace(/</g,'&lt;')}</p>
        </div>
      </div>
    `).join('');
  }

  function renderAnexosList(lead) {
    const anexos = lead.anexos || [];
    if (!anexos.length) return `<div class="anexos-empty">Nenhum arquivo anexado ainda.</div>`;
    return anexos.map(a => {
      const icon = a.tipo?.includes('pdf') ? '📕' : a.tipo?.includes('image') ? '🖼️' :
                   a.tipo?.includes('sheet') || a.tipo?.includes('excel') ? '📊' :
                   a.tipo?.includes('word') ? '📝' : a.tipo?.includes('zip') ? '📦' : '📄';
      return `
      <div class="anexo-item" id="anexo-${a.id}">
        <div class="anexo-icon-wrap">${icon}</div>
        <div class="anexo-info">
          <div class="anexo-nome">${a.nome}</div>
          <div class="anexo-meta">${a.tamanho || ''} · ${a.dataUpload || ''} · ${a.autorNome || ''}</div>
        </div>
        <div class="anexo-actions">
          <button class="anexo-btn" onclick="App.downloadAnexo('${lead.id}','${a.id}')" title="Baixar">⬇</button>
          <button class="anexo-btn delete" onclick="App.removeAnexoFromLead('${lead.id}','${a.id}')" title="Remover">✕</button>
        </div>
      </div>`;
    }).join('');
  }

  function openLeadModal(id) {
    const lead   = FriomacData.getLeadById(id);
    if (!lead) return;
    const fmt    = FriomacData.formatCurrency.bind(FriomacData);
    const stages = FriomacData.getStages();
    const stageIdx = stages.findIndex(s => s.id === lead.etapa);
    const rep    = lead.vendedor ? FriomacData.getRepById(lead.vendedor) : null;
    const obsCount   = (lead.observacoes || []).length;
    const anexoCount = (lead.anexos || []).length;

    document.getElementById('modal-lead').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0112 0v2"/></svg>
        Lead #${lead.id} — ${lead.nomFantasia || lead.cliente}
      </div>
      <button class="btn-close" onclick="App.closeModal('overlay-lead')">✕</button>
    </div>

    ${lead.resultado === 'ganho' ? `
    <div class="lead-status-banner ganho">
      🏆 <strong>Venda Concretizada</strong>${lead.dataFechamento ? ' em ' + FriomacData.formatDate(lead.dataFechamento) : ''}
      <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="App.reativarLead('${lead.id}')">↩ Reativar Lead</button>
    </div>` : ''}
    ${lead.resultado === 'perdido' ? `
    <div class="lead-status-banner perdido">
      ❌ <strong>Lead Perdido</strong>${lead.motivoPerda ? ' — ' + lead.motivoPerda : ''}
      <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="App.reativarLead('${lead.id}')">↩ Reativar Lead</button>
    </div>` : ''}

    <div class="modal-tab-bar">
      <button class="modal-tab active" id="mtab-info" onclick="App.switchModalTab('info','${lead.id}')">Informações</button>
      <button class="modal-tab" id="mtab-obs" onclick="App.switchModalTab('obs','${lead.id}')">Observações${obsCount > 0 ? ` (${obsCount})` : ''}</button>
      <button class="modal-tab" id="mtab-anexos" onclick="App.switchModalTab('anexos','${lead.id}')">Anexos${anexoCount > 0 ? ` (${anexoCount})` : ''}</button>
    </div>

    <div class="modal-body" style="padding:0">

      <!-- TAB INFO -->
      <div id="tab-info-${lead.id}" class="modal-tab-content active" style="padding:20px 24px">
        <div class="stage-timeline">
          ${stages.map((s,i) => `
          <div class="stage-step" onclick="App.moveLeadStage('${lead.id}','${s.id}')" style="cursor:pointer" title="${s.label}">
            <div class="step-dot ${i < stageIdx ? 'done' : i === stageIdx ? 'current' : 'pending'}">${i < stageIdx ? '✓' : i+1}</div>
            <div class="step-label">${s.icon}<br>${s.label.split(' ')[0]}</div>
          </div>`).join('')}
        </div>
        <div class="divider"></div>
        <div class="lead-detail-grid" style="margin-bottom:18px">
          <div class="detail-field"><label>Nome Fantasia</label><p>${lead.nomFantasia || '—'}</p></div>
          <div class="detail-field"><label>Cliente / Contato</label><p>${lead.nomeCliente || lead.cliente || '—'}</p></div>
          <div class="detail-field"><label>Telefone</label><p>${lead.telefone || lead.tel || '—'}</p></div>
          <div class="detail-field"><label>Email</label><p>${lead.email || '—'}</p></div>
          <div class="detail-field"><label>Valor do Orçamento</label><p style="font-size:1.1rem;font-weight:800;color:var(--primary)">${fmt(lead.valor)}</p></div>
          <div class="detail-field"><label>Canal</label><p>${lead.canal || '—'}</p></div>
          <div class="detail-field"><label>Vendedor / Rep.</label><p>${rep ? rep.nome : (lead.vendedor || '—')}</p></div>
          <div class="detail-field"><label>Nº Projeto</label><p>${lead.numeroProjeto || lead.projeto || '—'}</p></div>
          <div class="detail-field"><label>Data Abertura</label><p>${FriomacData.formatDate(lead.dataAbertura)}</p></div>
          <div class="detail-field"><label>Dias em Aberto</label><p><span class="badge ${lead.diasAberto>90?'badge-danger':lead.diasAberto>30?'badge-warning':'badge-success'}">${lead.diasAberto} dias</span></p></div>
          <div class="detail-field"><label>Prioridade</label><p><span class="badge ${FriomacData.getPrioridadeBadge(lead.prioridade)}">${lead.prioridade||'—'}</span></p></div>
          <div class="detail-field"><label>Status</label><p><span class="badge badge-info">${lead.status||'—'}</span></p></div>
        </div>
        <div style="margin-top:16px">
          <label class="form-label">Mover para etapa</label>
          <select class="form-control" id="lead-stage-sel-${lead.id}" ${lead.resultado?'disabled':''}>
            ${stages.map(s => `<option value="${s.id}" ${s.id===lead.etapa?'selected':''}>${s.icon} ${s.label}</option>`).join('')}
          </select>
        </div>
        <div style="margin-top:14px">
          <label class="form-label">Vendedor / Representante</label>
          <select class="form-control" id="lead-rep-sel-${lead.id}">
            <option value="">Não atribuído</option>
            ${FriomacData.getReps().map(r => `<option value="${r.id}" ${r.id===lead.vendedor?'selected':''}>${r.nome}</option>`).join('')}
          </select>
        </div>
        <div style="margin-top:14px">
          <label class="form-label">Prioridade</label>
          <select class="form-control" id="lead-prio-sel-${lead.id}">
            <option value="alta"  ${lead.prioridade==='alta' ?'selected':''}>🔴 Alta</option>
            <option value="média" ${lead.prioridade==='média'?'selected':''}>🟡 Média</option>
            <option value="baixa" ${lead.prioridade==='baixa'?'selected':''}>🟢 Baixa</option>
          </select>
        </div>
      </div>

      <!-- TAB OBSERVAÇÕES -->
      <div id="tab-obs-${lead.id}" class="modal-tab-content" style="display:none;flex-direction:column;height:480px">
        <div class="obs-timeline" id="obs-timeline-${lead.id}" style="flex:1;overflow-y:auto;padding:16px 20px">
          ${renderObsTimeline(lead)}
        </div>
        <div class="obs-compose">
          <textarea id="obs-input-${lead.id}" class="form-control" rows="3" placeholder="Escreva uma observação... (cada post é imutável após o envio)"></textarea>
          <div class="obs-compose-footer">
            <span style="font-size:.75rem;color:var(--text-3)">🔒 Observações não podem ser editadas após o envio</span>
            <button class="btn btn-accent btn-sm" onclick="App.postObservacao('${lead.id}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              Publicar
            </button>
          </div>
        </div>
      </div>

      <!-- TAB ANEXOS -->
      <div id="tab-anexos-${lead.id}" class="modal-tab-content" style="padding:16px 20px">
        <div class="anexos-header">
          <span class="anexos-title">📎 Documentos e arquivos anexados</span>
          <label class="anexo-upload-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Anexar arquivo
            <input type="file" style="display:none" accept="*/*" onchange="App.handleFileAttach('${lead.id}',this)">
          </label>
        </div>
        <div class="anexos-list" id="anexos-list-${lead.id}">
          ${renderAnexosList(lead)}
        </div>
        <div style="margin-top:12px;font-size:.75rem;color:var(--text-3)">
          Tipos aceitos: PDF, imagens, DWG, planilhas, contratos. Máx. 10MB por arquivo.
        </div>
      </div>

    </div>
    <div class="modal-footer">
      ${!lead.resultado ? `<button class="btn btn-warning btn-sm" style="background:var(--accent);color:white;border:none" onclick="App.showOutcomeDialog('${lead.id}')">🎯 Decisão Final</button>` : ''}
      <button class="btn btn-ghost" onclick="App.closeModal('overlay-lead')">Fechar</button>
      <button class="btn btn-accent" onclick="App.saveLead('${lead.id}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        Salvar
      </button>
    </div>`;

    openModal('overlay-lead');
  }

  function switchModalTab(tab, leadId) {
    const displays = { info: 'block', obs: 'flex', anexos: 'block' };
    ['info','obs','anexos'].forEach(t => {
      const el = document.getElementById(`tab-${t}-${leadId}`);
      if (el) { el.style.display = t === tab ? displays[t] : 'none'; el.classList.toggle('active', t === tab); }
      const btn = document.getElementById(`mtab-${t}`);
      if (btn) btn.classList.toggle('active', t === tab);
    });
  }

  function saveLead(id) {
    const stage  = document.getElementById(`lead-stage-sel-${id}`)?.value;
    const rep    = document.getElementById(`lead-rep-sel-${id}`)?.value;
    const prio   = document.getElementById(`lead-prio-sel-${id}`)?.value;
    const updates = {};
    if (stage) updates.etapa = stage;
    if (rep !== undefined) updates.vendedor = rep;
    if (prio) updates.prioridade = prio;
    FriomacData.updateLead(id, updates);
    closeModal('overlay-lead');
    toast('Lead atualizado com sucesso!', 'success');
    if (_currentScreen === 'kanban') renderKanban();
    else if (_currentScreen === 'dashboard') renderDashboard();
    else if (_currentScreen === 'orcamentos') renderOrcamentos();
  }

  function moveLeadStage(id, stage) {
    document.getElementById(`lead-stage-sel-${id}`)?.let && null;
    const sel = document.getElementById(`lead-stage-sel-${id}`);
    if (sel) sel.value = stage;
  }

  function deleteLead(id) {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return;
    FriomacData.deleteLead(id);
    closeModal('overlay-lead');
    toast('Lead excluído.', 'warning');
    renderScreen(_currentScreen);
  }

  // ── OBSERVAÇÕES ────────────────────────────────────
  function postObservacao(leadId) {
    const input = document.getElementById(`obs-input-${leadId}`);
    const texto = input?.value?.trim();
    if (!texto) { toast('Escreva uma observação antes de publicar.', 'warning'); return; }
    const user = FriomacData.getUser();
    FriomacData.addObservacao(leadId, texto, user);
    input.value = '';
    const lead = FriomacData.getLeadById(leadId);
    const timeline = document.getElementById(`obs-timeline-${leadId}`);
    if (timeline) {
      timeline.innerHTML = renderObsTimeline(lead);
      timeline.scrollTop = 0;
    }
    const obsTab = document.getElementById('mtab-obs');
    if (obsTab) obsTab.textContent = `Observações (${(lead.observacoes||[]).length})`;
    toast('Observação registrada!', 'success');
  }

  // ── ANEXOS ─────────────────────────────────────────
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/(1024*1024)).toFixed(1) + ' MB';
  }

  function handleFileAttach(leadId, input) {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast('Arquivo maior que 10MB. Escolha um menor.', 'warning'); return; }
    const reader = new FileReader();
    reader.onload = function(ev) {
      const user = FriomacData.getUser();
      FriomacData.addAnexo(leadId, {
        nome: file.name,
        tipo: file.type,
        tamanho: formatFileSize(file.size),
        base64: ev.target.result,
        dataUpload: new Date().toLocaleDateString('pt-BR'),
        autorId:   user?.id   || 'u1',
        autorNome: user?.nome || 'Usuário',
      });
      const lead = FriomacData.getLeadById(leadId);
      const listEl = document.getElementById(`anexos-list-${leadId}`);
      if (listEl) listEl.innerHTML = renderAnexosList(lead);
      const aTab = document.getElementById('mtab-anexos');
      if (aTab) aTab.textContent = `Anexos (${(lead.anexos||[]).length})`;
      toast(`"${file.name}" anexado com sucesso!`, 'success');
    };
    reader.onerror = () => toast('Erro ao ler o arquivo.', 'error');
    reader.readAsDataURL(file);
    input.value = '';
  }

  function downloadAnexo(leadId, anexoId) {
    const lead  = FriomacData.getLeadById(leadId);
    const anexo = (lead?.anexos || []).find(a => a.id === anexoId);
    if (!anexo) return;
    const data = FriomacData.getAnexoData(leadId, anexoId);
    if (!data) { toast('Arquivo não encontrado no armazenamento.', 'error'); return; }
    const link = document.createElement('a');
    link.href = data;
    link.download = anexo.nome;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function removeAnexoFromLead(leadId, anexoId) {
    if (!confirm('Remover este arquivo?')) return;
    FriomacData.removeAnexo(leadId, anexoId);
    const lead = FriomacData.getLeadById(leadId);
    const listEl = document.getElementById(`anexos-list-${leadId}`);
    if (listEl) listEl.innerHTML = renderAnexosList(lead);
    const aTab = document.getElementById('mtab-anexos');
    if (aTab) aTab.textContent = `Anexos${(lead.anexos||[]).length > 0 ? ` (${lead.anexos.length})` : ''}`;
    toast('Arquivo removido.', 'warning');
  }

  // ── OUTCOME DIALOG ─────────────────────────────────
  function showOutcomeDialog(leadId) {
    const lead = FriomacData.getLeadById(leadId);
    if (!lead) return;
    const fmt = FriomacData.formatCurrency.bind(FriomacData);
    document.getElementById('modal-generic').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">🎯 Decisão Final — Lead #${leadId}</div>
      <button class="btn-close" onclick="App.closeModal('overlay-generic')">✕</button>
    </div>
    <div class="modal-body">
      <p style="margin-bottom:6px;font-size:.9rem;color:var(--text-2)"><strong>${lead.nomFantasia||lead.cliente}</strong></p>
      <p style="margin-bottom:24px;font-size:1.1rem;font-weight:800;color:var(--primary)">${fmt(lead.valor)}</p>
      <div class="outcome-choices">
        <div class="outcome-btn ganho" onclick="App.showGanhoForm('${leadId}')">
          <div class="outcome-icon">🏆</div>
          <strong>Venda Concretizada</strong>
          <span>Negócio fechado! Gera registro de entrega e comissão automaticamente.</span>
        </div>
        <div class="outcome-btn perdido" onclick="App.showPerdidoForm('${leadId}')">
          <div class="outcome-icon">❌</div>
          <strong>Venda Não Concretizada</strong>
          <span>Lead vai para "Clientes Perdidos". Pode ser reativado a qualquer momento.</span>
        </div>
      </div>
      <p style="margin-top:16px;font-size:.75rem;color:var(--text-3);text-align:center">
        ℹ O cliente permanece no banco de dados e pode retornar ao funil ativo quando necessário.
      </p>
    </div>`;
    closeModal('overlay-lead');
    openModal('overlay-generic');
  }

  function showPerdidoForm(leadId) {
    const lead = FriomacData.getLeadById(leadId);
    if (!lead) return;
    document.getElementById('modal-generic').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">❌ Motivo da Perda — #${leadId}</div>
      <button class="btn-close" onclick="App.closeModal('overlay-generic')">✕</button>
    </div>
    <div class="modal-body">
      <p style="margin-bottom:18px;color:var(--text-2)">Registre o motivo para análise futura de perdas.</p>
      <div class="form-group">
        <label class="form-label">Motivo principal *</label>
        <select class="form-control" id="motivo-perdido">
          <option>Preço acima do orçamento do cliente</option>
          <option>Cliente escolheu concorrente</option>
          <option>Projeto cancelado pelo cliente</option>
          <option>Sem contato / cliente sumiu</option>
          <option>Prazo de entrega incompatível</option>
          <option>Produto fora do escopo</option>
          <option>Outro</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Detalhes adicionais</label>
        <textarea class="form-control" id="detalhe-perdido" rows="3" placeholder="Mais informações sobre o motivo da perda..."></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="App.showOutcomeDialog('${leadId}')">← Voltar</button>
      <button class="btn btn-danger" onclick="App.doPerdido('${leadId}')">Confirmar Perda</button>
    </div>`;
  }

  function showGanhoForm(leadId) {
    const lead = FriomacData.getLeadById(leadId);
    if (!lead) return;
    const fmt  = FriomacData.formatCurrency.bind(FriomacData);
    const reps = FriomacData.getReps();
    const rep  = lead.vendedor ? FriomacData.getRepById(lead.vendedor) : null;
    const hoje = new Date().toISOString().split('T')[0];

    document.getElementById('modal-generic').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">🏆 Venda Concretizada — #${leadId}</div>
      <button class="btn-close" onclick="App.closeModal('overlay-generic')">✕</button>
    </div>
    <div class="modal-body">
      <div style="background:var(--success-bg);border:1px solid rgba(22,163,74,.2);border-radius:var(--radius);padding:10px 14px;margin-bottom:18px;font-size:.82rem;color:var(--success)">
        <strong>${lead.nomFantasia || lead.cliente}</strong> · Orçamento original: ${fmt(lead.valor)}
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Preço Final da Venda (R$) *</label>
          <input class="form-control" id="gf-preco" type="number" min="0" step="0.01"
                 value="${lead.valor}" oninput="App.calcComissao('${leadId}')">
        </div>
        <div class="form-group">
          <label class="form-label">Forma de Pagamento *</label>
          <select class="form-control" id="gf-pagto">
            <option>À Vista</option>
            <option>PIX</option>
            <option>Boleto Bancário</option>
            <option>Parcelado (cartão)</option>
            <option>Financiado</option>
            <option>Nota Promissória</option>
            <option>Cheque</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Prazo de Entrega *</label>
          <input class="form-control" id="gf-prazo" type="date" min="${hoje}">
        </div>
        <div class="form-group">
          <label class="form-label">Multa por dia de atraso (R$)</label>
          <input class="form-control" id="gf-multa" type="number" min="0" step="0.01" value="0">
        </div>
      </div>

      <div class="divider"></div>
      <div style="font-size:.78rem;font-weight:700;color:var(--text-3);letter-spacing:.05em;margin-bottom:12px">COMISSÃO</div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Vendedor / Representante</label>
          <select class="form-control" id="gf-vend"
                  onchange="App.calcComissao('${leadId}', true)">
            <option value="">Nenhum</option>
            ${reps.map(r => `<option value="${r.id}" ${r.id === lead.vendedor ? 'selected' : ''}>${r.nome} (${r.comissao}%)</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">% Comissão</label>
          <input class="form-control" id="gf-pct" type="number" min="0" max="100" step="0.5"
                 value="${rep?.comissao || 5}" oninput="App.calcComissao('${leadId}')">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Valor da Comissão (R$)</label>
        <input class="form-control" id="gf-comval" type="number" step="0.01"
               style="background:var(--surface-2);font-weight:700;color:var(--success)"
               placeholder="Calculado automaticamente">
        <div style="font-size:.72rem;color:var(--text-3);margin-top:4px">Editável — ajuste se necessário</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="App.showOutcomeDialog('${leadId}')">← Voltar</button>
      <button class="btn btn-accent" style="background:var(--success);border-color:var(--success)"
              onclick="App.doGanho('${leadId}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Confirmar Venda
      </button>
    </div>`;

    // Initialize calculation with current rep
    setTimeout(() => calcComissao(leadId, true), 50);
  }

  function calcComissao(leadId, updatePct) {
    const preco  = parseFloat(document.getElementById('gf-preco')?.value || 0);
    const vendId = document.getElementById('gf-vend')?.value;
    const pctEl  = document.getElementById('gf-pct');
    const comEl  = document.getElementById('gf-comval');
    if (updatePct && vendId) {
      const rep = FriomacData.getRepById(vendId);
      if (rep && pctEl) pctEl.value = rep.comissao;
    }
    const pct = parseFloat(pctEl?.value || 0);
    if (comEl) comEl.value = (preco * pct / 100).toFixed(2);
  }

  function doGanho(leadId) {
    const preco  = parseFloat(document.getElementById('gf-preco')?.value);
    const pagto  = document.getElementById('gf-pagto')?.value;
    const prazo  = document.getElementById('gf-prazo')?.value;
    const multa  = parseFloat(document.getElementById('gf-multa')?.value || 0);
    const vendId = document.getElementById('gf-vend')?.value;
    const pct    = parseFloat(document.getElementById('gf-pct')?.value || 0);
    const comVal = parseFloat(document.getElementById('gf-comval')?.value || 0);

    if (!preco || preco <= 0) { toast('Informe o preço final da venda.', 'warning'); return; }
    if (!pagto)               { toast('Selecione a forma de pagamento.', 'warning'); return; }
    if (!prazo)               { toast('Informe o prazo de entrega.', 'warning');     return; }

    FriomacData.concluirVenda(leadId, {
      precoFinal:     preco,
      formaPagamento: pagto,
      dataPrevEntrega: prazo,
      multaDia:       multa,
      vendedor:       vendId || undefined,
      pct,
      valorComissao:  comVal,
    });
    closeModal('overlay-generic');
    toast('🏆 Venda concretizada! Entrega e comissão geradas automaticamente.', 'success', 5000);
    if (_currentScreen === 'kanban') renderKanban();
    else if (_currentScreen === 'dashboard') renderDashboard();
  }

  function doPerdido(leadId) {
    const motivo  = document.getElementById('motivo-perdido')?.value || '';
    const detalhe = document.getElementById('detalhe-perdido')?.value?.trim() || '';
    FriomacData.marcarPerdido(leadId, motivo + (detalhe ? ': ' + detalhe : ''));
    closeModal('overlay-generic');
    toast('Lead marcado como perdido. Pode ser reativado a qualquer momento.', 'warning');
    if (_currentScreen === 'kanban') renderKanban();
    else if (_currentScreen === 'dashboard') renderDashboard();
  }

  function reativarLead(leadId) {
    if (!confirm('Reativar este lead no funil ativo?')) return;
    FriomacData.reativarLead(leadId);
    closeModal('overlay-lead');
    closeModal('overlay-generic');
    toast('Lead reativado no funil! Edite a etapa conforme necessário.', 'success');
    if (_currentScreen === 'kanban') renderKanban();
    else renderDashboard();
  }

  // ── NEW LEAD MODAL ──────────────────────────────────
  function openNewLeadModal() {
    const reps = FriomacData.getReps();
    const stages = FriomacData.getStages();

    document.getElementById('modal-lead').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo Lead
      </div>
      <button class="btn-close" onclick="App.closeModal('overlay-lead')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Nome Fantasia / Empresa *</label>
          <input class="form-control" id="nl-nome" placeholder="Ex: Supermercado Bom Preço" required>
        </div>
        <div class="form-group">
          <label class="form-label">Nome do Contato</label>
          <input class="form-control" id="nl-contato" placeholder="Ex: João Silva">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Telefone</label>
          <input class="form-control" id="nl-tel" placeholder="(11) 9-9999-9999">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-control" id="nl-email" type="email" placeholder="contato@empresa.com.br">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Valor do Orçamento (R$) *</label>
          <input class="form-control" id="nl-valor" type="number" placeholder="0" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Canal</label>
          <select class="form-control" id="nl-canal">
            <option value="CANAL PRÓPRIO">Canal Próprio</option>
            <option value="REPRESENTANTE">Representante</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Vendedor / Representante</label>
          <select class="form-control" id="nl-vendedor">
            <option value="">Não atribuído</option>
            ${reps.map(r=>`<option value="${r.id}">${r.nome}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Prioridade</label>
          <select class="form-control" id="nl-prio">
            <option value="alta">🔴 Alta</option>
            <option value="média" selected>🟡 Média</option>
            <option value="baixa">🟢 Baixa</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Etapa Inicial</label>
        <select class="form-control" id="nl-etapa">
          ${stages.map(s=>`<option value="${s.id}">${s.icon} ${s.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Nº Projeto</label>
        <input class="form-control" id="nl-projeto" placeholder="Ex: P2700">
      </div>
      <div class="form-group">
        <label class="form-label">Observações</label>
        <textarea class="form-control" id="nl-obs" rows="3" placeholder="Informações relevantes sobre este lead..."></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="App.closeModal('overlay-lead')">Cancelar</button>
      <button class="btn btn-accent" onclick="App.createNewLead()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Criar Lead
      </button>
    </div>`;

    openModal('overlay-lead');
  }

  function createNewLead() {
    const nome  = document.getElementById('nl-nome')?.value?.trim();
    const email = document.getElementById('nl-email')?.value?.trim();
    const tel   = document.getElementById('nl-tel')?.value?.trim();
    const valor = parseFloat(document.getElementById('nl-valor')?.value || '0');
    if (!nome)  { toast('Preencha o nome da empresa.', 'warning');     return; }
    if (!email) { toast('Informe o e-mail do cliente.', 'warning');    return; }
    if (!tel)   { toast('Informe o telefone do cliente.', 'warning');  return; }

    const lead = FriomacData.addLead({
      nomFantasia: nome,
      nomeCliente: document.getElementById('nl-contato')?.value?.trim(),
      tel:         document.getElementById('nl-tel')?.value?.trim(),
      email:       document.getElementById('nl-email')?.value?.trim(),
      valor,
      canal:       document.getElementById('nl-canal')?.value,
      vendedor:    document.getElementById('nl-vendedor')?.value,
      prioridade:  document.getElementById('nl-prio')?.value,
      etapa:       document.getElementById('nl-etapa')?.value,
      projeto:     document.getElementById('nl-projeto')?.value?.trim(),
      observacoes: document.getElementById('nl-obs')?.value?.trim(),
      status: 'EM ABERTO',
      cliente: nome,
    });

    closeModal('overlay-lead');
    toast(`Lead "${nome}" criado com sucesso!`, 'success');
    renderKanban();
  }

  // ══════════════════════════════════════════════════
  // CLIENTES
  // ══════════════════════════════════════════════════
  let _cliSort = 'az';  // az | za | rec30 | rec90 | rec365

  function renderClientes() {
    const fmt = FriomacData.formatCurrency.bind(FriomacData);
    const all = FriomacData.getClientes();
    const sortedAll = _sortClientes(all, _cliSort);

    document.getElementById('screen-clientes').innerHTML = `
    <div class="toolbar" style="flex-wrap:wrap;gap:8px">
      <div class="search-bar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="cli-search" placeholder="Buscar cliente..." oninput="App.searchClientes(this.value)">
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${['az','za','rec30','rec90','rec365'].map(s=>`
          <button class="btn btn-sm ${_cliSort===s?'btn-accent':'btn-ghost'}" onclick="App.setCliSort('${s}')">
            ${{az:'A→Z',za:'Z→A',rec30:'30 dias',rec90:'90 dias',rec365:'12 meses'}[s]}
          </button>`).join('')}
        <span class="badge badge-info" style="padding:6px 12px;margin-left:4px">${all.length} clientes</span>
      </div>
    </div>
    <div class="card">
      <div class="table-wrapper">
        <table id="clientes-table">
          <thead><tr>
            <th>Empresa / Cliente</th>
            <th>Contato</th>
            <th>Telefone</th>
            <th>Email</th>
            <th>Canal</th>
            <th>Orçamentos</th>
            <th>Total Orçado</th>
            <th>Cadastro</th>
            <th>Ações</th>
          </tr></thead>
          <tbody id="clientes-tbody">
            ${renderClientesRows(sortedAll)}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  function _sortClientes(list, sort) {
    const hoje = new Date();
    const dias = { rec30: 30, rec90: 90, rec365: 365 };
    if (sort === 'az')  return [...list].sort((a,b)=>(a.nomeFantasia||'').localeCompare(b.nomeFantasia||'','pt-BR'));
    if (sort === 'za')  return [...list].sort((a,b)=>(b.nomeFantasia||'').localeCompare(a.nomeFantasia||'','pt-BR'));
    if (dias[sort]) {
      const lim = dias[sort];
      return [...list]
        .filter(c => { const d = new Date(c.dataCadastro||'2000-01-01'); return (hoje-d)/86400000 <= lim; })
        .sort((a,b) => new Date(b.dataCadastro) - new Date(a.dataCadastro));
    }
    return list;
  }

  function setCliSort(sort) {
    _cliSort = sort;
    renderClientes();
  }

  function renderClientesRows(list) {
    const fmt = FriomacData.formatCurrency.bind(FriomacData);
    if (!list.length) return `<tr><td colspan="9"><div class="empty-state"><p>Nenhum cliente encontrado.</p></div></td></tr>`;
    return list.map(c => `
    <tr>
      <td><div style="font-weight:700">${c.nomeFantasia||'—'}</div><div style="font-size:.72rem;color:var(--text-3)">${c.segmento||''}</div></td>
      <td>${c.nomeCliente||'—'}</td>
      <td>${c.telefone||'—'}</td>
      <td style="font-size:.82rem">${c.email||'—'}</td>
      <td><span class="badge ${c.canal==='REPRESENTANTE'?'badge-purple':'badge-primary'}">${c.canal||'—'}</span></td>
      <td style="text-align:center;font-weight:700">${c.qtdOrcamentos||0}</td>
      <td style="font-weight:700;color:var(--primary)">${fmt(c.totalOrcado||0)}</td>
      <td style="font-size:.78rem;color:var(--text-3)">${FriomacData.formatDate(c.dataCadastro)||'—'}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="App.openEditClienteModal('${c.id}')">Ver / Editar</button>
      </td>
    </tr>`).join('');
  }

  function searchClientes(q) {
    const all  = FriomacData.getClientes(q);
    const list = _sortClientes(all, _cliSort);
    document.getElementById('clientes-tbody').innerHTML = renderClientesRows(list);
  }

  function openEditClienteModal(id) {
    const c = FriomacData.getClientes().find(x=>x.id===id);
    if (!c) return;

    // Pull related lead data
    const leads = FriomacData.getLeads().filter(l =>
      (l.nomFantasia && l.nomFantasia === c.nomeFantasia) ||
      (l.cliente && l.cliente === c.nomeFantasia)
    ).sort((a,b) => new Date(b.dataAbertura) - new Date(a.dataAbertura));
    const latestLead = leads[0];
    const allAnexos  = leads.flatMap(l => (l.anexos||[]).map(a => ({...a, leadId: l.id, orcNum: l.id})));
    const fmt = FriomacData.formatCurrency.bind(FriomacData);

    const anexosHTML = allAnexos.length ? allAnexos.map(a => `
      <div class="doc-category-row" style="gap:8px">
        <span style="font-size:1rem">${_fileIcon(a.tipo)}</span>
        <span class="doc-cat-label" style="min-width:0;flex:1;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.nome}</span>
        <span class="doc-cat-status">Orç #${a.orcNum}</span>
        <button class="btn btn-ghost btn-sm" onclick="App.downloadAnexoFromLead('${a.leadId}','${a.id}')">⬇</button>
      </div>`).join('') : '<p style="font-size:.82rem;color:var(--text-3)">Nenhum documento anexado.</p>';

    const leadsHTML = leads.length ? leads.slice(0,5).map(l => `
      <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);font-size:.82rem">
        <span style="font-family:monospace;color:var(--text-3)">#${l.id}</span>
        <span style="flex:1">${l.projeto||'S/P'}</span>
        <span style="font-weight:700;color:var(--primary)">${fmt(l.valor)}</span>
        <span class="badge ${l.resultado==='ganho'?'badge-success':l.resultado==='perdido'?'badge-danger':'badge-warning'}" style="font-size:.68rem">${l.resultado==='ganho'?'GANHO':l.resultado==='perdido'?'PERDIDO':l.etapa||'ABERTO'}</span>
      </div>`).join('') : '<p style="font-size:.82rem;color:var(--text-3)">Sem leads vinculados.</p>';

    const mg = document.getElementById('modal-generic');
    mg.classList.add('modal-rep');
    mg.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${c.nomeFantasia||'Cliente'}</div>
      <button class="btn-close" onclick="App.closeModal('overlay-generic');document.getElementById('modal-generic').classList.remove('modal-rep')">✕</button>
    </div>
    <div class="modal-body" style="padding-top:0">
      <div class="modal-tab-bar" style="margin:0 -26px 0;padding:0 26px">
        <button class="modal-tab active" id="ctab-dados"    onclick="App.switchCliTab('dados')">Dados</button>
        <button class="modal-tab"        id="ctab-leads"    onclick="App.switchCliTab('leads')">Orçamentos (${leads.length})</button>
        <button class="modal-tab"        id="ctab-docs"     onclick="App.switchCliTab('docs')">Documentos${allAnexos.length?` (${allAnexos.length})`:''}</button>
      </div>

      <!-- DADOS -->
      <div class="rep-tab-section active" id="csec-dados" style="padding:16px 0 4px">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Nome Fantasia</label><input class="form-control" id="ec-nome" value="${_v(c.nomeFantasia)}"></div>
          <div class="form-group"><label class="form-label">Nome Contato</label><input class="form-control" id="ec-contato" value="${_v(c.nomeCliente)}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Telefone</label><input class="form-control" id="ec-tel" value="${_v(c.telefone)}"></div>
          <div class="form-group"><label class="form-label">Email</label><input class="form-control" id="ec-email" value="${_v(c.email)}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Segmento</label><input class="form-control" id="ec-seg" value="${_v(c.segmento)}"></div>
          <div class="form-group"><label class="form-label">Canal</label>
            <select class="form-control" id="ec-canal">
              <option ${c.canal==='CANAL PRÓPRIO'?'selected':''}>CANAL PRÓPRIO</option>
              <option ${c.canal==='REPRESENTANTE'?'selected':''}>REPRESENTANTE</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Cidade</label><input class="form-control" id="ec-cidade" value="${_v(c.cidade||latestLead?.cidade||'')}"></div>
          <div class="form-group"><label class="form-label">Estado</label><input class="form-control" id="ec-estado" value="${_v(c.estado||latestLead?.estado||'')}"></div>
        </div>
        <div class="form-group"><label class="form-label">Observações</label><textarea class="form-control" id="ec-obs" rows="3" style="resize:vertical">${c.obs||latestLead?.observacoes?.map(o=>o.texto)?.join('\n')||''}</textarea></div>
        ${c.dataCadastro?`<p style="font-size:.76rem;color:var(--text-3);margin-top:8px">Cadastro: ${FriomacData.formatDate(c.dataCadastro)} · ID: ${c.id}</p>`:''}
      </div>

      <!-- ORÇAMENTOS -->
      <div class="rep-tab-section" id="csec-leads" style="padding:16px 0 4px">
        <p class="form-section-title">Histórico de Orçamentos</p>
        ${leadsHTML}
        ${leads.length>5?`<p style="font-size:.78rem;color:var(--text-3);margin-top:8px">+ ${leads.length-5} orçamentos anteriores</p>`:''}
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);display:flex;gap:14px;font-size:.82rem">
          <span>Total orçado: <strong style="color:var(--primary)">${fmt(c.totalOrcado||0)}</strong></span>
          <span>Orçamentos: <strong>${leads.length}</strong></span>
          <span>Fechados: <strong style="color:var(--success)">${leads.filter(l=>l.resultado==='ganho').length}</strong></span>
        </div>
      </div>

      <!-- DOCUMENTOS -->
      <div class="rep-tab-section" id="csec-docs" style="padding:16px 0 4px">
        <p class="form-section-title">Documentos vinculados aos orçamentos</p>
        ${anexosHTML}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="App.closeModal('overlay-generic');document.getElementById('modal-generic').classList.remove('modal-rep')">Fechar</button>
      <button class="btn btn-accent" onclick="App.saveCliente('${id}')">Salvar dados</button>
    </div>`;
    openModal('overlay-generic');
  }

  function switchCliTab(tab) {
    ['dados','leads','docs'].forEach(t => {
      document.getElementById(`ctab-${t}`)?.classList.toggle('active', t===tab);
      const sec = document.getElementById(`csec-${t}`);
      if(sec) sec.classList.toggle('active', t===tab);
    });
  }

  function downloadAnexoFromLead(leadId, anexoId) {
    const lead = FriomacData.getLeadById(leadId);
    if(!lead) return;
    const anx = (lead.anexos||[]).find(a=>a.id===anexoId);
    if(!anx) return;
    const data = FriomacData.getAnexoData(leadId, anexoId);
    if(!data){ toast('Arquivo não disponível.','warning'); return; }
    const link = document.createElement('a');
    link.href = data; link.download = anx.nome; link.click();
  }

  function saveCliente(id) {
    FriomacData.updateCliente(id, {
      nomeFantasia: document.getElementById('ec-nome')?.value?.trim(),
      nomeCliente:  document.getElementById('ec-contato')?.value?.trim(),
      telefone:     document.getElementById('ec-tel')?.value?.trim(),
      email:        document.getElementById('ec-email')?.value?.trim(),
      segmento:     document.getElementById('ec-seg')?.value?.trim(),
      canal:        document.getElementById('ec-canal')?.value,
      cidade:       document.getElementById('ec-cidade')?.value?.trim(),
      estado:       document.getElementById('ec-estado')?.value?.trim(),
      obs:          document.getElementById('ec-obs')?.value?.trim(),
    });
    document.getElementById('modal-generic').classList.remove('modal-rep');
    closeModal('overlay-generic');
    toast('Cliente atualizado!', 'success');
    renderClientes();
  }

  function deleteCliente(id) {
    if (!confirm('Excluir este cliente?')) return;
    FriomacData.deleteCliente(id);
    toast('Cliente removido.', 'warning');
    renderClientes();
  }

  // ══════════════════════════════════════════════════
  // ORÇAMENTOS
  // ══════════════════════════════════════════════════
  function renderOrcamentos() {
    const leads = FriomacData.getLeads();
    const fmt   = FriomacData.formatCurrency.bind(FriomacData);
    const stages= FriomacData.getStages();
    const totalOrc = leads.reduce((s,l)=>s+(l.valor||0),0);
    const altaPrio = leads.filter(l=>l.prioridade==='alta').length;

    document.getElementById('screen-orcamentos').innerHTML = `
    <div class="stats-row">
      <div class="stat-mini"><strong>${leads.length}</strong><span>Total de orçamentos</span></div>
      <div class="stat-mini"><strong style="color:var(--accent)">${fmt(totalOrc)}</strong><span>Valor total em aberto</span></div>
      <div class="stat-mini"><strong style="color:var(--danger)">${altaPrio}</strong><span>Alta prioridade</span></div>
      <div class="stat-mini"><strong style="color:var(--warning)">${leads.filter(l=>l.diasAberto>90).length}</strong><span>Acima de 90 dias</span></div>
    </div>

    <div class="toolbar">
      <div class="search-bar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="orc-search" placeholder="Buscar por cliente, nº..." oninput="App.searchOrcamentos(this.value)">
      </div>
      <select class="form-control" style="width:auto" id="orc-stage-filter" onchange="App.filterOrcamentos()">
        <option value="">Todas as etapas</option>
        ${stages.map(s=>`<option value="${s.id}">${s.icon} ${s.label}</option>`).join('')}
      </select>
      <select class="form-control" style="width:auto" id="orc-prio-filter" onchange="App.filterOrcamentos()">
        <option value="">Todas prioridades</option>
        <option value="alta">🔴 Alta</option>
        <option value="média">🟡 Média</option>
        <option value="baixa">🟢 Baixa</option>
      </select>
      <div style="margin-left:auto">
        <button class="btn btn-accent btn-sm" onclick="App.openNewLeadModal()">+ Novo Orçamento</button>
      </div>
    </div>

    <div class="card">
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>Nº</th>
            <th>Cliente</th>
            <th>Projeto</th>
            <th>Etapa do Funil</th>
            <th>Valor</th>
            <th>Canal</th>
            <th>Vendedor</th>
            <th>Dias</th>
            <th>Prioridade</th>
            <th>Ações</th>
          </tr></thead>
          <tbody id="orc-tbody">
            ${renderOrcamentosRows(leads)}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  function renderOrcamentosRows(list) {
    const fmt = FriomacData.formatCurrency.bind(FriomacData);
    if (!list.length) return `<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-3)">Nenhum orçamento encontrado</td></tr>`;
    return list.map(l => {
      const s   = FriomacData.getStageById(l.etapa);
      const rep = l.vendedor ? FriomacData.getRepById(l.vendedor) : null;
      return `
      <tr style="cursor:pointer" onclick="App.openLeadModal('${l.id}')">
        <td style="font-family:monospace;font-weight:700;color:var(--text-3)">#${l.id}</td>
        <td>
          <div style="font-weight:700;font-size:.85rem">${l.nomFantasia||l.cliente}</div>
          <div style="font-size:.7rem;color:var(--text-3)">${l.nomeCliente||''}</div>
        </td>
        <td style="font-size:.8rem;color:var(--text-2)">${l.projeto||l.numeroProjeto||'—'}</td>
        <td><span class="badge badge-info" style="font-size:.7rem">${s?.icon||''} ${s?.label||l.etapa}</span></td>
        <td style="font-weight:800;color:var(--primary)">${fmt(l.valor)}</td>
        <td><span class="badge ${l.canal==='REPRESENTANTE'?'badge-purple':'badge-primary'}" style="font-size:.7rem">${l.canal||'—'}</span></td>
        <td style="font-size:.8rem">${rep ? rep.nome.split(' ')[0] : '—'}</td>
        <td><span class="badge ${l.diasAberto>90?'badge-danger':l.diasAberto>30?'badge-warning':'badge-success'}">${l.diasAberto}d</span></td>
        <td><span class="badge ${FriomacData.getPrioridadeBadge(l.prioridade)}">${l.prioridade||'—'}</span></td>
        <td onclick="event.stopPropagation()">
          <div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-sm" onclick="App.advanceLead('${l.id}')">→</button>
            <button class="btn btn-ghost btn-sm" onclick="App.openLeadModal('${l.id}')">✎</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function searchOrcamentos(q) {
    const stage = document.getElementById('orc-stage-filter')?.value;
    const prio  = document.getElementById('orc-prio-filter')?.value;
    const list  = FriomacData.getLeads({ search: q, etapa: stage||undefined, prioridade: prio||undefined });
    document.getElementById('orc-tbody').innerHTML = renderOrcamentosRows(list);
  }

  function filterOrcamentos() {
    const q     = document.getElementById('orc-search')?.value;
    const stage = document.getElementById('orc-stage-filter')?.value;
    const prio  = document.getElementById('orc-prio-filter')?.value;
    const list  = FriomacData.getLeads({ search: q||undefined, etapa: stage||undefined, prioridade: prio||undefined });
    document.getElementById('orc-tbody').innerHTML = renderOrcamentosRows(list);
  }

  // ══════════════════════════════════════════════════
  // VENDEDORES
  // ══════════════════════════════════════════════════
  function renderVendedores() {
    const reps = FriomacData.getReps();
    const fmt  = FriomacData.formatCurrency.bind(FriomacData);
    const ativos   = reps.filter(r => r.ativo !== false);
    const inativos = reps.filter(r => r.ativo === false);
    const canalOwnReps = ativos.filter(r=>r.canal==='Canal Próprio');
    const externalReps = ativos.filter(r=>r.canal==='Representante');
    const isAdmin = FriomacData.getUser()?.role === 'master';

    document.getElementById('screen-vendedores').innerHTML = `
    <div class="stats-row">
      <div class="stat-mini"><strong>${ativos.length}</strong><span>Ativos</span></div>
      <div class="stat-mini"><strong>${canalOwnReps.length}</strong><span>Canal Próprio</span></div>
      <div class="stat-mini"><strong>${externalReps.length}</strong><span>Representantes</span></div>
      <div class="stat-mini"><strong style="color:var(--accent)">${fmt(ativos.reduce((s,r)=>s+(r.totalOrc||0),0))}</strong><span>Total orçado</span></div>
    </div>

    <div class="toolbar" style="margin-bottom:20px">
      <div class="tab-bar" style="margin:0;border:none">
        <button class="tab-btn active" id="tab-todos"    onclick="App.tabVend('todos')">Todos Ativos (${ativos.length})</button>
        <button class="tab-btn"        id="tab-proprio"  onclick="App.tabVend('proprio')">Canal Próprio (${canalOwnReps.length})</button>
        <button class="tab-btn"        id="tab-rep"      onclick="App.tabVend('rep')">Representantes (${externalReps.length})</button>
        ${inativos.length ? `<button class="tab-btn" id="tab-inativos" onclick="App.tabVend('inativos')">Inativos (${inativos.length})</button>` : ''}
      </div>
      <div style="margin-left:auto;display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" onclick="App.navigateTo('campanhas')">📣 Campanhas & Mídias</button>
        ${isAdmin ? `<button class="btn btn-accent btn-sm" onclick="App.openNewRepModal()">+ Novo Vendedor</button>` : ''}
      </div>
    </div>

    <div class="rep-cards-grid" id="reps-grid">
      ${renderRepCards(ativos)}
    </div>`;
  }

  function _v(val) { return (val||'').replace(/"/g, '&quot;'); }

  function renderRepCards(list) {
    const fmt    = FriomacData.formatCurrency.bind(FriomacData);
    const leads  = FriomacData.getLeads();
    const isAdmin= FriomacData.getUser()?.role === 'master';
    return list.map(r => {
      const repLeads = leads.filter(l=>l.vendedor===r.id);
      const totalOrc = repLeads.reduce((s,l)=>s+(l.valor||0),0);
      const taxaConv = repLeads.length ? ((r.fechados||0)/repLeads.length*100).toFixed(0) : 0;
      const initials = FriomacData.getInitials(r.nome);
      const ranking  = r.qtdOrc > 0 ? (r.totalOrc > 150000 ? '🥇' : r.totalOrc > 50000 ? '🥈' : '🥉') : '';
      const inativo  = r.ativo === false;

      return `
      <div class="rep-card${inativo?' inativo':''}">
        <div class="rep-card-header">
          <div class="rep-avatar">${initials}</div>
          <div class="rep-info">
            <h3>${r.nome}${inativo?'<span class="rep-inativo-badge">INATIVO</span>':''}</h3>
            <span><span class="badge ${r.canal==='Canal Próprio'?'badge-primary':'badge-purple'}" style="font-size:.68rem">${r.canal}</span></span>
          </div>
          ${ranking&&!inativo ? `<div style="font-size:1.4rem;margin-left:auto">${ranking}</div>` : ''}
        </div>
        <div class="rep-stats">
          <div class="rep-stat"><strong>${repLeads.length||r.qtdOrc}</strong><span>Orçamentos</span></div>
          <div class="rep-stat"><strong>${r.fechados||0}</strong><span>Fechados</span></div>
          <div class="rep-stat"><strong>${fmt(totalOrc||r.totalOrc)}</strong><span>Total orçado</span></div>
          <div class="rep-stat"><strong style="color:var(--success)">${taxaConv}%</strong><span>Conversão</span></div>
        </div>
        ${r.email||r.tel ? `
        <div style="font-size:.75rem;color:var(--text-3);padding:8px 0;border-top:1px solid var(--border)">
          ${r.tel  ? `📞 ${r.tel}<br>` : ''}
          ${r.email? `✉ ${r.email}` : ''}
        </div>` : ''}
        <div class="rep-ranking">
          <span style="font-size:.75rem;color:var(--text-3)">Comissão: <strong style="color:var(--primary)">${r.comissao||0}%</strong></span>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-ghost btn-sm" onclick="App.openEditRepModal('${r.id}')">Editar</button>
            ${!inativo ? `<button class="btn btn-ghost btn-sm" onclick="App.navigateTo('kanban');App.kanbanFilter('vendedor','${r.id}')">Leads</button>` : ''}
            ${isAdmin && !inativo ? `<button class="btn btn-sm" style="background:var(--danger-bg);color:var(--danger);border:1px solid var(--danger)" onclick="App.confirmarInativarRep('${r.id}')">Inativar</button>` : ''}
            ${isAdmin && inativo  ? `<button class="btn btn-sm" style="background:var(--success-bg);color:var(--success);border:1px solid var(--success)" onclick="App.ativarRep('${r.id}')">Reativar</button>` : ''}
          </div>
        </div>
      </div>`;
    }).join('') || '<p style="color:var(--text-3);padding:20px">Nenhum cadastro nesta categoria.</p>';
  }

  function tabVend(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-'+tab)?.classList.add('active');
    const reps = FriomacData.getReps();
    let list = reps.filter(r=>r.ativo!==false);
    if (tab === 'proprio')  list = list.filter(r=>r.canal==='Canal Próprio');
    if (tab === 'rep')      list = list.filter(r=>r.canal==='Representante');
    if (tab === 'inativos') list = reps.filter(r=>r.ativo===false);
    document.getElementById('reps-grid').innerHTML = renderRepCards(list);
  }

  function confirmarInativarRep(id) {
    const r = FriomacData.getRepById(id);
    if (!r) return;
    document.getElementById('modal-generic').innerHTML = `
    <div class="modal-header">
      <div class="modal-title" style="color:var(--danger)">⚠ Inativar Cadastro</div>
      <button class="btn-close" onclick="App.closeModal('overlay-generic')">✕</button>
    </div>
    <div class="modal-body">
      <p style="margin-bottom:16px">Tem certeza que deseja <strong>inativar</strong> o cadastro de <strong>${r.nome}</strong>?</p>
      <div style="background:var(--warning-bg);border:1px solid var(--warning);border-radius:var(--radius);padding:12px;font-size:.84rem;color:var(--warning)">
        ⚠ O cadastro será mantido no sistema, mas o vendedor não poderá realizar orçamentos ou incluir novos leads. Apenas administradores podem inativar ou reativar cadastros.
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="App.closeModal('overlay-generic')">Cancelar</button>
      <button class="btn btn-sm" style="background:var(--danger);color:#fff" onclick="App.inativarRep('${id}')">Confirmar Inativação</button>
    </div>`;
    openModal('overlay-generic');
  }

  function inativarRep(id) {
    const r = FriomacData.inativarRep(id);
    closeModal('overlay-generic');
    toast(`Cadastro de ${r?.nome||'vendedor'} inativado.`, 'warning');
    renderVendedores();
  }

  function ativarRep(id) {
    const r = FriomacData.ativarRep(id);
    toast(`Cadastro de ${r?.nome||'vendedor'} reativado!`, 'success');
    renderVendedores();
  }

  // ── REP MODAL (full form) ───────────────────────
  function _repFormHTML(r, prefix, saveBtn) {
    const reps = FriomacData.getReps();
    const v = (x) => _v(r?.[x]);
    const docCats = [
      { key:'contrato_social',    label:'Contrato Social' },
      { key:'comprv_endereco',    label:'Comprovante de Endereço' },
      { key:'cartao_cnpj',        label:'Cartão CNPJ' },
      { key:'comprv_bancario',    label:'Comprovante Bancário' },
      { key:'doc_foto',           label:'Documento com Foto' },
      { key:'contrato_rep',       label:'Contrato de Representação' },
    ];
    const anexos   = r?.anexos || [];
    const docRows  = docCats.map(dc => {
      const found = anexos.filter(a=>a.categoria===dc.key);
      return `<div class="doc-category-row">
        <span class="doc-cat-label">${dc.label}</span>
        <span class="doc-cat-status${found.length?' ok':''}">
          ${found.length ? `✓ ${found.length} arquivo(s)` : 'Pendente'}
        </span>
        ${r ? `<button class="btn btn-ghost btn-sm btn-upload-doc" onclick="App.handleRepFileAttach('${r.id}','${dc.key}')">Anexar</button>` : ''}
      </div>`;
    }).join('');
    const anexoList = r ? `
      <div style="margin-top:12px">
        ${anexos.length ? anexos.map(a=>`
          <div class="doc-category-row" style="gap:8px">
            <span style="font-size:1rem">${_fileIcon(a.tipo)}</span>
            <span class="doc-cat-label" style="min-width:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.nome}</span>
            <span class="doc-cat-status">${a.dataAnexo}</span>
            <button class="btn btn-ghost btn-sm" onclick="App.downloadRepAnexo('${r.id}','${a.id}')">⬇</button>
            <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="App.removeRepAnexo('${r.id}','${a.id}')">✕</button>
          </div>`).join('') : '<p style="font-size:.82rem;color:var(--text-3);padding:8px 0">Nenhum arquivo anexado ainda.</p>'}
        <div style="margin-top:10px">
          <button class="btn btn-ghost btn-sm" onclick="App.handleRepFileAttach('${r.id}','outro')">+ Adicionar outro documento</button>
        </div>
      </div>` : '<p style="font-size:.82rem;color:var(--text-3);padding:8px 0">Salve o cadastro primeiro para anexar documentos.</p>';

    return `
    <div class="modal-tab-bar" style="margin:0 -26px 0;padding:0 26px">
      <button class="modal-tab active" id="${prefix}tab-ident"    onclick="App.switchRepTab('ident','${prefix}')">Identificação</button>
      <button class="modal-tab"        id="${prefix}tab-contato"  onclick="App.switchRepTab('contato','${prefix}')">Contato</button>
      <button class="modal-tab"        id="${prefix}tab-financ"   onclick="App.switchRepTab('financ','${prefix}')">Financeiro</button>
      <button class="modal-tab"        id="${prefix}tab-redes"    onclick="App.switchRepTab('redes','${prefix}')">Redes Sociais</button>
      <button class="modal-tab"        id="${prefix}tab-docs"     onclick="App.switchRepTab('docs','${prefix}')">Documentos${anexos.length?` (${anexos.length})`:''}</button>
    </div>

    <!-- IDENTIFICAÇÃO -->
    <div class="rep-tab-section active" id="${prefix}sec-ident" style="padding:18px 0 4px">
      <div class="form-row">
        <div class="form-group" style="flex:2">
          <label class="form-label">Nome completo *</label>
          <input class="form-control" id="${prefix}nome" value="${v('nome')}">
        </div>
        <div class="form-group">
          <label class="form-label">Tipo *</label>
          <select class="form-control" id="${prefix}canal">
            <option ${(!r||r.canal==='Canal Próprio')?'selected':''}>Canal Próprio</option>
            <option ${r?.canal==='Representante'?'selected':''}>Representante</option>
            <option ${r?.canal==='Vendedor'?'selected':''}>Vendedor</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nome Fantasia</label><input class="form-control" id="${prefix}nfantasia" value="${v('nomeFantasia')}"></div>
        <div class="form-group"><label class="form-label">Razão Social</label><input class="form-control" id="${prefix}razao" value="${v('razaoSocial')}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">CNPJ / CPF</label><input class="form-control" id="${prefix}cnpj" value="${v('cnpj')}" placeholder="00.000.000/0001-00"></div>
        <div class="form-group"><label class="form-label">% Comissão</label><input class="form-control" id="${prefix}com" type="number" step="0.5" value="${r?.comissao??5}"></div>
      </div>
    </div>

    <!-- CONTATO -->
    <div class="rep-tab-section" id="${prefix}sec-contato" style="padding:18px 0 4px">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Email *</label><input class="form-control" id="${prefix}email" type="email" value="${v('email')}"></div>
        <div class="form-group"><label class="form-label">Telefone / WhatsApp *</label><input class="form-control" id="${prefix}tel" value="${v('tel')}" placeholder="(11) 9-9999-9999"></div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:2"><label class="form-label">Endereço</label><input class="form-control" id="${prefix}end" value="${v('endereco')}" placeholder="Rua, número, complemento"></div>
        <div class="form-group"><label class="form-label">CEP</label><input class="form-control" id="${prefix}cep" value="${v('cep')}" placeholder="00000-000"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Cidade</label><input class="form-control" id="${prefix}cidade" value="${v('cidade')}"></div>
        <div class="form-group"><label class="form-label">Estado</label><input class="form-control" id="${prefix}estado" value="${v('estado')}" placeholder="SP"></div>
      </div>
    </div>

    <!-- FINANCEIRO -->
    <div class="rep-tab-section" id="${prefix}sec-financ" style="padding:18px 0 4px">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Banco</label><input class="form-control" id="${prefix}banco" value="${v('banco')}"></div>
        <div class="form-group"><label class="form-label">Agência</label><input class="form-control" id="${prefix}agencia" value="${v('agencia')}" placeholder="0000-0"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Conta Corrente</label><input class="form-control" id="${prefix}conta" value="${v('conta')}" placeholder="00000-0"></div>
        <div class="form-group"><label class="form-label">PIX</label><input class="form-control" id="${prefix}pix" value="${v('pix')}" placeholder="CPF, CNPJ, email ou telefone"></div>
      </div>
      <div class="form-group"><label class="form-label">Observação Financeira</label><textarea class="form-control" id="${prefix}obsfinc" rows="3" style="resize:vertical">${r?.obsFinanceiro||''}</textarea></div>
    </div>

    <!-- REDES SOCIAIS -->
    <div class="rep-tab-section" id="${prefix}sec-redes" style="padding:18px 0 4px">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">📸 Instagram</label>
          <input class="form-control" id="${prefix}instagram" value="${v('instagram')}" placeholder="@usuario">
        </div>
        <div class="form-group">
          <label class="form-label">💼 LinkedIn</label>
          <input class="form-control" id="${prefix}linkedin" value="${v('linkedin')}" placeholder="linkedin.com/in/...">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">🎵 TikTok</label>
          <input class="form-control" id="${prefix}tiktok" value="${v('tiktok')}" placeholder="@usuario">
        </div>
        <div class="form-group">
          <label class="form-label">🌐 Website</label>
          <input class="form-control" id="${prefix}website" value="${v('website')}" placeholder="www.exemplo.com.br">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Outros links / redes</label>
        <input class="form-control" id="${prefix}outrasredes" value="${v('outrasRedes')}" placeholder="Facebook, YouTube, etc.">
      </div>
    </div>

    <!-- DOCUMENTOS -->
    <div class="rep-tab-section" id="${prefix}sec-docs" style="padding:18px 0 4px">
      <p class="form-section-title">Documentos obrigatórios</p>
      <div class="doc-category-list">${docRows}</div>
      <p class="form-section-title">Todos os arquivos</p>
      ${anexoList}
    </div>`;
  }

  function switchRepTab(tab, prefix) {
    const tabs = ['ident','contato','financ','redes','docs'];
    tabs.forEach(t => {
      document.getElementById(`${prefix}tab-${t}`)?.classList.toggle('active', t===tab);
      const sec = document.getElementById(`${prefix}sec-${t}`);
      if(sec) sec.classList.toggle('active', t===tab);
    });
  }

  function openNewRepModal() {
    const mg = document.getElementById('modal-generic');
    mg.classList.add('modal-rep');
    mg.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">+ Novo Vendedor / Representante</div>
      <button class="btn-close" onclick="App.closeModal('overlay-generic')">✕</button>
    </div>
    <div class="modal-body" style="padding-top:0">
      ${_repFormHTML(null, 'nr-', '')}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="App.closeModal('overlay-generic')">Cancelar</button>
      <button class="btn btn-accent" onclick="App.createRep()">Cadastrar</button>
    </div>`;
    openModal('overlay-generic');
  }

  function _readRepFields(prefix) {
    const g = id => document.getElementById(prefix+id)?.value?.trim();
    return {
      nome:         g('nome'),
      canal:        g('canal') || 'Canal Próprio',
      nomeFantasia: g('nfantasia'),
      razaoSocial:  g('razao'),
      cnpj:         g('cnpj'),
      comissao:     parseFloat(document.getElementById(prefix+'com')?.value||'5'),
      email:        g('email'),
      tel:          g('tel'),
      endereco:     g('end'),
      cep:          g('cep'),
      cidade:       g('cidade'),
      estado:       g('estado'),
      banco:        g('banco'),
      agencia:      g('agencia'),
      conta:        g('conta'),
      pix:          g('pix'),
      obsFinanceiro:document.getElementById(prefix+'obsfinc')?.value?.trim(),
      instagram:    g('instagram'),
      linkedin:     g('linkedin'),
      tiktok:       g('tiktok'),
      website:      g('website'),
      outrasRedes:  g('outrasredes'),
    };
  }

  function createRep() {
    const d = _readRepFields('nr-');
    if (!d.nome)  { toast('Preencha o nome completo.', 'warning'); switchRepTab('ident','nr-'); return; }
    if (!d.email) { toast('Informe o e-mail.', 'warning'); switchRepTab('contato','nr-'); return; }
    if (!d.tel)   { toast('Informe o telefone.', 'warning'); switchRepTab('contato','nr-'); return; }
    const nr = FriomacData.addRep(d);
    document.getElementById('modal-generic').classList.remove('modal-rep');
    closeModal('overlay-generic');
    toast(`${d.nome} cadastrado!`, 'success');
    renderVendedores();
  }

  function openEditRepModal(id) {
    const r = FriomacData.getRepById(id);
    if (!r) return;
    const mg = document.getElementById('modal-generic');
    mg.classList.add('modal-rep');
    mg.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">Editar — ${r.nome}</div>
      <button class="btn-close" onclick="App.closeModal('overlay-generic')">✕</button>
    </div>
    <div class="modal-body" style="padding-top:0">
      ${_repFormHTML(r, 'er-', '')}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="App.closeModal('overlay-generic')">Cancelar</button>
      <button class="btn btn-accent" onclick="App.saveRep('${id}')">Salvar</button>
    </div>`;
    openModal('overlay-generic');
  }

  function saveRep(id) {
    const d = _readRepFields('er-');
    if (!d.nome)  { toast('Preencha o nome completo.', 'warning'); switchRepTab('ident','er-'); return; }
    if (!d.email) { toast('Informe o e-mail.', 'warning'); switchRepTab('contato','er-'); return; }
    if (!d.tel)   { toast('Informe o telefone.', 'warning'); switchRepTab('contato','er-'); return; }
    FriomacData.updateRep(id, d);
    document.getElementById('modal-generic').classList.remove('modal-rep');
    closeModal('overlay-generic');
    toast('Dados atualizados!', 'success');
    renderVendedores();
  }

  // Rep annexo handlers
  function handleRepFileAttach(repId, categoria) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { toast('Arquivo muito grande. Máx 10 MB.', 'warning'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const user = FriomacData.getUser();
        FriomacData.addRepAnexo(repId, {
          nome: file.name, tipo: file.type, tamanho: file.size,
          categoria, autorNome: user?.nome || 'Usuário',
          base64: ev.target.result,
        });
        toast('Documento anexado!', 'success');
        openEditRepModal(repId);
        switchRepTab('docs', 'er-');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function downloadRepAnexo(repId, anexoId) {
    const rep = FriomacData.getRepById(repId);
    if (!rep) return;
    const anexo = (rep.anexos||[]).find(a=>a.id===anexoId);
    if (!anexo) return;
    const data = FriomacData.getRepAnexoData(repId, anexoId);
    if (!data) { toast('Arquivo não encontrado.', 'error'); return; }
    const link = document.createElement('a');
    link.href = data;
    link.download = anexo.nome;
    link.click();
  }

  function removeRepAnexo(repId, anexoId) {
    FriomacData.removeRepAnexo(repId, anexoId);
    toast('Arquivo removido.', 'info');
    openEditRepModal(repId);
    switchRepTab('docs', 'er-');
  }

  // ══════════════════════════════════════════════════
  // CAMPANHAS & MÍDIAS
  // ══════════════════════════════════════════════════
  let _campTab = 'campanhas';

  function renderCampanhas() {
    const isAdmin  = FriomacData.getUser()?.role === 'master';
    const user     = FriomacData.getUser();
    const camps    = FriomacData.getCampanhas();
    const solics   = FriomacData.getSolicitacoesMkt();
    const repo     = FriomacData.getRepositorioMkt();
    const coms     = FriomacData.getComunicados();
    const reps     = FriomacData.getReps().filter(r=>r.ativo!==false);
    const fmt      = FriomacData.formatCurrency.bind(FriomacData);

    const tabs = [
      { id:'campanhas', label:'🏆 Campanhas',      desc:'Campanhas de incentivo' },
      { id:'midia',     label:'📱 Estratégia de Mídia', desc:'Planejamento de redes sociais' },
      { id:'solicitar', label:'🖨 Solicitar MKT',   desc:'Pedir materiais de marketing' },
      { id:'repositorio',label:'📁 Repositório MKT',desc:'Arquivos e materiais criados' },
      { id:'comunicados',label:'📣 Comunicados',    desc:'Avisos e comunicações' },
    ];

    const tabBtns = tabs.map(t => `
      <button class="camp-tab-btn${_campTab===t.id?' active':''}" onclick="App.switchCampTab('${t.id}')">
        <span class="camp-tab-icon">${t.label.split(' ')[0]}</span>
        ${t.label.replace(/^\S+\s*/,'')}
      </button>`).join('');

    // ── Campanhas de Incentivo ──
    const campCards = camps.length ? camps.map(c => `
      <div class="camp-card">
        <div class="camp-card-icon">🏆</div>
        <div class="camp-card-body">
          <div class="camp-card-title">${c.titulo}</div>
          <div class="camp-card-desc">${c.descricao||''}</div>
          <div class="camp-card-meta">
            <span>📅 ${c.dataInicio||'—'} → ${c.dataFim||'—'}</span>
            <span>🎯 ${c.meta||'—'}</span>
            <span class="badge ${c.status==='ativa'?'badge-success':'badge-secondary'}">${c.status||'ativa'}</span>
          </div>
        </div>
        ${isAdmin?`<div class="camp-card-actions">
          <button class="btn btn-ghost btn-sm" onclick="App.openEditCampanhaModal('${c.id}')">Editar</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="App.deleteCampanha('${c.id}')">✕</button>
        </div>`:''}
      </div>`).join('') :
      `<div class="camp-empty"><div class="camp-empty-icon">🏆</div><p>Nenhuma campanha criada ainda.${isAdmin?' Crie a primeira campanha!':''}</p></div>`;

    // ── Estratégia de Mídia ──
    const midiaCards = camps.filter(c=>c.tipo==='midia').length ? camps.filter(c=>c.tipo==='midia').map(c=>`
      <div class="camp-card">
        <div class="camp-card-icon">📱</div>
        <div class="camp-card-body">
          <div class="camp-card-title">${c.titulo}</div>
          <div class="camp-card-desc">${c.descricao||''}</div>
          <div class="camp-card-meta">
            <span>📅 ${c.dataInicio||'—'}</span>
            <span>📌 ${c.plataforma||'Geral'}</span>
          </div>
        </div>
        ${isAdmin?`<div class="camp-card-actions">
          <button class="btn btn-ghost btn-sm" onclick="App.openEditCampanhaModal('${c.id}')">Editar</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="App.deleteCampanha('${c.id}')">✕</button>
        </div>`:''}
      </div>`).join('') :
      `<div class="camp-empty"><div class="camp-empty-icon">📱</div><p>Nenhuma estratégia de mídia registrada.${isAdmin?' Adicione uma!':''}</p></div>`;

    // ── Solicitações MKT ──
    const solicCards = solics.length ? solics.map(s => `
      <div class="solic-card">
        <div style="font-size:1.6rem">${_solicIcon(s.tipo)}</div>
        <div class="solic-card-info">
          <div class="solic-card-title">${s.titulo}</div>
          <div class="solic-card-sub">Solicitado por: <strong>${s.solicitante||'—'}</strong> · ${s.dataSolicita||'—'}</div>
          ${s.obs?`<div class="solic-card-sub">${s.obs}</div>`:''}
        </div>
        <span class="badge ${s.status==='pendente'?'badge-warning':s.status==='aprovado'?'badge-success':'badge-secondary'}">${s.status||'pendente'}</span>
        ${isAdmin?`<div style="display:flex;gap:6px;margin-left:8px">
          ${s.status==='pendente'?`<button class="btn btn-sm" style="background:var(--success-bg);color:var(--success)" onclick="App.updateSolicMkt('${s.id}','aprovado')">Aprovar</button>
          <button class="btn btn-sm" style="background:var(--danger-bg);color:var(--danger)" onclick="App.updateSolicMkt('${s.id}','recusado')">Recusar</button>`:''}
        </div>`:''}
      </div>`).join('') :
      `<div class="camp-empty"><div class="camp-empty-icon">🖨</div><p>Nenhuma solicitação registrada.</p></div>`;

    // ── Repositório ──
    const repoItems = repo.length ? repo.map(item => `
      <div class="repo-item">
        <div class="repo-item-icon">${_fileIcon(item.tipo)}</div>
        <div class="repo-item-info">
          <div class="repo-item-name">${item.nome}</div>
          <div class="repo-item-meta">
            <span class="repo-tag">${item.categoria||'Geral'}</span>
            ${item.dataUpload||''}${item.tamanho?' · '+_fileSizeStr(item.tamanho):''}
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="App.downloadRepoItem('${item.id}')">⬇ Baixar</button>
          ${isAdmin?`<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="App.deleteRepoItem('${item.id}')">✕</button>`:''}
        </div>
      </div>`).join('') :
      `<div class="camp-empty"><div class="camp-empty-icon">📁</div><p>Repositório vazio.${isAdmin?' Faça o primeiro upload!':''}</p></div>`;

    // ── Comunicados ──
    const comunicadoCards = coms.length ? coms.map(c => {
      const lido = c.lidos?.includes(user?.id);
      return `<div class="comunicado-card ${c.urgencia||''}">
        <div class="comunicado-header">
          <div class="comunicado-title">${lido?'':'🔵 '}${c.titulo}</div>
          <div style="display:flex;gap:6px;align-items:center">
            ${c.urgencia==='urgente'?'<span class="badge" style="background:var(--danger-bg);color:var(--danger)">URGENTE</span>':''}
            ${isAdmin?`<button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="App.deleteComunicado('${c.id}')">✕</button>`:''}
          </div>
        </div>
        <div class="comunicado-body">${(c.corpo||'').replace(/\n/g,'<br>')}</div>
        <div class="comunicado-meta">
          <span>📅 ${c.dataEnvio||'—'}</span>
          <span>👤 ${c.autor||'Administrador'}</span>
          <span>👥 ${c.destinatarios==='todos'?'Todos os vendedores':c.destinatarios||'Todos'}</span>
          <span>✓ Lidos: ${c.lidos?.length||0}</span>
        </div>
        ${!lido&&!isAdmin?`<button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="App.marcarComunicadoLido('${c.id}')">Marcar como lido</button>`:''}
      </div>`;
    }).join('') :
    `<div class="camp-empty"><div class="camp-empty-icon">📣</div><p>Nenhum comunicado enviado.${isAdmin?' Crie o primeiro comunicado!':''}</p></div>`;

    document.getElementById('screen-campanhas').innerHTML = `
    <div class="camp-section-tabs">${tabBtns}</div>

    <!-- Campanhas de Incentivo -->
    <div class="camp-section${_campTab==='campanhas'?' active':''}" id="camp-sec-campanhas">
      <div class="toolbar" style="margin-bottom:16px">
        <strong style="color:var(--text-1)">Campanhas de Incentivo</strong>
        <div style="margin-left:auto">
          ${isAdmin?`<button class="btn btn-accent btn-sm" onclick="App.openNewCampanhaModal('incentivo')">+ Nova Campanha</button>`:''}
        </div>
      </div>
      ${campCards}
    </div>

    <!-- Estratégia de Mídia -->
    <div class="camp-section${_campTab==='midia'?' active':''}" id="camp-sec-midia">
      <div class="toolbar" style="margin-bottom:16px">
        <strong style="color:var(--text-1)">Estratégias de Mídia Social</strong>
        <div style="margin-left:auto">
          ${isAdmin?`<button class="btn btn-accent btn-sm" onclick="App.openNewCampanhaModal('midia')">+ Nova Estratégia</button>`:''}
        </div>
      </div>
      ${midiaCards}
    </div>

    <!-- Solicitar MKT -->
    <div class="camp-section${_campTab==='solicitar'?' active':''}" id="camp-sec-solicitar">
      <div class="toolbar" style="margin-bottom:16px">
        <strong style="color:var(--text-1)">Solicitação de Materiais de Marketing</strong>
        <div style="margin-left:auto">
          <button class="btn btn-accent btn-sm" onclick="App.openNovaSolicModal()">+ Solicitar Material</button>
        </div>
      </div>
      ${solicCards}
    </div>

    <!-- Repositório MKT -->
    <div class="camp-section${_campTab==='repositorio'?' active':''}" id="camp-sec-repositorio">
      <div class="toolbar" style="margin-bottom:16px">
        <strong style="color:var(--text-1)">Repositório de Marketing</strong>
        <div style="margin-left:auto">
          ${isAdmin?`<button class="btn btn-accent btn-sm" onclick="App.uploadRepoItem()">⬆ Adicionar Arquivo</button>`:''}
        </div>
      </div>
      ${repoItems}
    </div>

    <!-- Comunicados -->
    <div class="camp-section${_campTab==='comunicados'?' active':''}" id="camp-sec-comunicados">
      <div class="toolbar" style="margin-bottom:16px">
        <strong style="color:var(--text-1)">Comunicados</strong>
        <div style="margin-left:auto">
          ${isAdmin?`<button class="btn btn-accent btn-sm" onclick="App.openNovoComunicadoModal()">+ Novo Comunicado</button>`:''}
        </div>
      </div>
      ${comunicadoCards}
    </div>`;
  }

  function switchCampTab(tab) {
    _campTab = tab;
    document.querySelectorAll('.camp-tab-btn').forEach((b,i) => b.classList.toggle('active', b.textContent.trim().includes(
      {campanhas:'Campanhas',midia:'Mídia',solicitar:'Solicitar',repositorio:'Repositório',comunicados:'Comunicados'}[tab]||tab
    )));
    document.querySelectorAll('.camp-section').forEach(s => s.classList.remove('active'));
    document.getElementById('camp-sec-'+tab)?.classList.add('active');
  }

  function _solicIcon(tipo) {
    const m = {folheto:'📄',foto:'📷',banner:'🖼',catalogo:'📘',midia_social:'📱',publicidade:'📺',outro:'📦'};
    return m[tipo]||'📦';
  }
  function _fileSizeStr(bytes) {
    if(!bytes) return '';
    if(bytes>1024*1024) return (bytes/1024/1024).toFixed(1)+' MB';
    return (bytes/1024).toFixed(0)+' KB';
  }

  // ── Campanhas CRUD ──
  function openNewCampanhaModal(tipo='incentivo') {
    const isMidia = tipo==='midia';
    document.getElementById('modal-generic').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${isMidia?'📱 Nova Estratégia de Mídia':'🏆 Nova Campanha de Incentivo'}</div>
      <button class="btn-close" onclick="App.closeModal('overlay-generic')">✕</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="camp-tipo" value="${tipo}">
      <div class="form-group"><label class="form-label">Título *</label><input class="form-control" id="camp-titulo"></div>
      <div class="form-group"><label class="form-label">Descrição</label><textarea class="form-control" id="camp-desc" rows="3" style="resize:vertical"></textarea></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Data Início</label><input class="form-control" id="camp-ini" type="date"></div>
        <div class="form-group"><label class="form-label">Data Fim</label><input class="form-control" id="camp-fim" type="date"></div>
      </div>
      ${isMidia?`
      <div class="form-group"><label class="form-label">Plataforma</label>
        <select class="form-control" id="camp-plat">
          <option value="Instagram">Instagram</option>
          <option value="LinkedIn">LinkedIn</option>
          <option value="TikTok">TikTok</option>
          <option value="Google Ads">Google Ads</option>
          <option value="Geral">Geral / Múltiplas</option>
        </select>
      </div>` : `
      <div class="form-group"><label class="form-label">Meta / Objetivo</label><input class="form-control" id="camp-meta" placeholder="Ex: Vender 10 câmaras até Jun/2026"></div>`}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="App.closeModal('overlay-generic')">Cancelar</button>
      <button class="btn btn-accent" onclick="App.createCampanha()">Criar</button>
    </div>`;
    openModal('overlay-generic');
  }

  function openEditCampanhaModal(id) {
    const c = FriomacData.getCampanhas().find(x=>x.id===id);
    if(!c) return;
    document.getElementById('modal-generic').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">Editar Campanha</div>
      <button class="btn-close" onclick="App.closeModal('overlay-generic')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Título *</label><input class="form-control" id="camp-titulo" value="${_v(c.titulo)}"></div>
      <div class="form-group"><label class="form-label">Descrição</label><textarea class="form-control" id="camp-desc" rows="3" style="resize:vertical">${c.descricao||''}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Data Início</label><input class="form-control" id="camp-ini" type="date" value="${c.dataInicio||''}"></div>
        <div class="form-group"><label class="form-label">Data Fim</label><input class="form-control" id="camp-fim" type="date" value="${c.dataFim||''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Meta / Objetivo</label><input class="form-control" id="camp-meta" value="${_v(c.meta)}"></div>
        <div class="form-group"><label class="form-label">Status</label>
          <select class="form-control" id="camp-status">
            <option ${c.status==='ativa'?'selected':''}>ativa</option>
            <option ${c.status==='encerrada'?'selected':''}>encerrada</option>
            <option ${c.status==='pausada'?'selected':''}>pausada</option>
          </select>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="App.closeModal('overlay-generic')">Cancelar</button>
      <button class="btn btn-accent" onclick="App.saveCampanha('${id}')">Salvar</button>
    </div>`;
    openModal('overlay-generic');
  }

  function createCampanha() {
    const titulo = document.getElementById('camp-titulo')?.value?.trim();
    if(!titulo){ toast('Informe o título da campanha.','warning'); return; }
    FriomacData.addCampanha({
      titulo,
      tipo:       document.getElementById('camp-tipo')?.value||'incentivo',
      descricao:  document.getElementById('camp-desc')?.value?.trim(),
      dataInicio: document.getElementById('camp-ini')?.value,
      dataFim:    document.getElementById('camp-fim')?.value,
      meta:       document.getElementById('camp-meta')?.value?.trim(),
      plataforma: document.getElementById('camp-plat')?.value,
    });
    closeModal('overlay-generic');
    toast('Campanha criada!','success');
    renderCampanhas();
  }

  function saveCampanha(id) {
    FriomacData.updateCampanha(id, {
      titulo:     document.getElementById('camp-titulo')?.value?.trim(),
      descricao:  document.getElementById('camp-desc')?.value?.trim(),
      dataInicio: document.getElementById('camp-ini')?.value,
      dataFim:    document.getElementById('camp-fim')?.value,
      meta:       document.getElementById('camp-meta')?.value?.trim(),
      status:     document.getElementById('camp-status')?.value,
    });
    closeModal('overlay-generic');
    toast('Campanha atualizada!','success');
    renderCampanhas();
  }

  function deleteCampanha(id) {
    FriomacData.deleteCampanha(id);
    toast('Campanha removida.','info');
    renderCampanhas();
  }

  // ── Solicitações MKT ──
  function openNovaSolicModal() {
    const user = FriomacData.getUser();
    document.getElementById('modal-generic').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">🖨 Solicitar Material de Marketing</div>
      <button class="btn-close" onclick="App.closeModal('overlay-generic')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tipo de Material *</label>
          <select class="form-control" id="solic-tipo">
            <option value="folheto">Folheto / Flyer</option>
            <option value="foto">Foto Profissional</option>
            <option value="banner">Banner / Adesivo</option>
            <option value="catalogo">Catálogo de Produtos</option>
            <option value="midia_social">Material para Mídias Sociais</option>
            <option value="publicidade">Material Publicitário</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Quantidade</label>
          <input class="form-control" id="solic-qtd" type="number" value="1" min="1">
        </div>
      </div>
      <div class="form-group"><label class="form-label">Título / Descrição *</label><input class="form-control" id="solic-titulo" placeholder="Descreva o material necessário"></div>
      <div class="form-group"><label class="form-label">Observações / Detalhes</label><textarea class="form-control" id="solic-obs" rows="3" style="resize:vertical" placeholder="Cores, tamanhos, prazo desejado..."></textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="App.closeModal('overlay-generic')">Cancelar</button>
      <button class="btn btn-accent" onclick="App.createSolicMkt()">Enviar Solicitação</button>
    </div>`;
    openModal('overlay-generic');
  }

  function createSolicMkt() {
    const titulo = document.getElementById('solic-titulo')?.value?.trim();
    if(!titulo){ toast('Descreva o material solicitado.','warning'); return; }
    const user = FriomacData.getUser();
    FriomacData.addSolicitacaoMkt({
      titulo,
      tipo:        document.getElementById('solic-tipo')?.value,
      quantidade:  document.getElementById('solic-qtd')?.value,
      obs:         document.getElementById('solic-obs')?.value?.trim(),
      solicitante: user?.nome || 'Usuário',
    });
    closeModal('overlay-generic');
    toast('Solicitação enviada!','success');
    renderCampanhas();
  }

  function updateSolicMkt(id, status) {
    FriomacData.updateSolicitacaoMkt(id, { status });
    toast(status==='aprovado'?'Solicitação aprovada!':'Solicitação recusada.', status==='aprovado'?'success':'warning');
    renderCampanhas();
  }

  // ── Repositório MKT ──
  function uploadRepoItem() {
    document.getElementById('modal-generic').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">📁 Adicionar ao Repositório</div>
      <button class="btn-close" onclick="App.closeModal('overlay-generic')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Nome do Arquivo *</label><input class="form-control" id="repo-nome" placeholder="Ex: Catálogo Friomac 2026"></div>
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select class="form-control" id="repo-cat">
          <option>Logotipo</option>
          <option>Catálogo</option>
          <option>Manual de Equipamento</option>
          <option>Guia</option>
          <option>Campanha</option>
          <option>Material Digital</option>
          <option>Foto</option>
          <option>Outro</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Arquivo</label>
        <button class="btn btn-ghost btn-sm" id="repo-file-btn" onclick="App._repoPickFile()">Selecionar arquivo...</button>
        <span id="repo-file-name" style="font-size:.8rem;color:var(--text-3);margin-left:10px"></span>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="App.closeModal('overlay-generic')">Cancelar</button>
      <button class="btn btn-accent" onclick="App.saveRepoItem()">Salvar</button>
    </div>`;
    App._repoFileData = null;
    openModal('overlay-generic');
  }

  function _repoPickFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if(!file) return;
      if(file.size > 20*1024*1024){ toast('Arquivo muito grande. Máx 20 MB.','warning'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        App._repoFileData = { nome: file.name, tipo: file.type, tamanho: file.size, base64: ev.target.result };
        document.getElementById('repo-file-name').textContent = file.name;
        if(!document.getElementById('repo-nome').value) document.getElementById('repo-nome').value = file.name.replace(/\.[^.]+$/,'');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function saveRepoItem() {
    const nome = document.getElementById('repo-nome')?.value?.trim();
    if(!nome){ toast('Informe um nome.','warning'); return; }
    const cat = document.getElementById('repo-cat')?.value;
    const item = FriomacData.addItemRepo({ nome, categoria: cat, tipo: App._repoFileData?.tipo, tamanho: App._repoFileData?.tamanho });
    if(App._repoFileData?.base64) {
      try { localStorage.setItem(`friomac_repo_file_${item.id}`, App._repoFileData.base64); } catch(e){}
    }
    closeModal('overlay-generic');
    toast('Arquivo adicionado ao repositório!','success');
    renderCampanhas();
  }

  function downloadRepoItem(id) {
    const repo = FriomacData.getRepositorioMkt();
    const item = repo.find(i=>i.id===id);
    if(!item){ toast('Item não encontrado.','error'); return; }
    const data = FriomacData.getRepoItemData(id);
    if(!data){ toast('Arquivo não disponível para download.','warning'); return; }
    const link = document.createElement('a');
    link.href = data;
    link.download = item.nome;
    link.click();
  }

  function deleteRepoItem(id) {
    FriomacData.removeItemRepo(id);
    toast('Arquivo removido do repositório.','info');
    renderCampanhas();
  }

  // ── Comunicados ──
  function openNovoComunicadoModal() {
    const reps = FriomacData.getReps().filter(r=>r.ativo!==false);
    document.getElementById('modal-generic').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">📣 Novo Comunicado</div>
      <button class="btn-close" onclick="App.closeModal('overlay-generic')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group"><label class="form-label">Título *</label><input class="form-control" id="com-titulo"></div>
      <div class="form-group"><label class="form-label">Mensagem *</label><textarea class="form-control" id="com-corpo" rows="5" style="resize:vertical"></textarea></div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Urgência</label>
          <select class="form-control" id="com-urg">
            <option value="">Normal</option>
            <option value="urgente">🔴 Urgente</option>
            <option value="info">🔵 Informativo</option>
            <option value="sucesso">🟢 Boas notícias</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Destinatários</label>
          <select class="form-control" id="com-dest">
            <option value="todos">Todos os vendedores</option>
            ${reps.map(r=>`<option value="${r.id}">${r.nome}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="App.closeModal('overlay-generic')">Cancelar</button>
      <button class="btn btn-accent" onclick="App.createComunicado()">Enviar Comunicado</button>
    </div>`;
    openModal('overlay-generic');
  }

  function createComunicado() {
    const titulo = document.getElementById('com-titulo')?.value?.trim();
    const corpo  = document.getElementById('com-corpo')?.value?.trim();
    if(!titulo){ toast('Informe o título.','warning'); return; }
    if(!corpo) { toast('Escreva a mensagem.','warning'); return; }
    const user = FriomacData.getUser();
    FriomacData.addComunicado({
      titulo, corpo,
      urgencia:      document.getElementById('com-urg')?.value||'',
      destinatarios: document.getElementById('com-dest')?.value||'todos',
      autor:         user?.nome || 'Administrador',
    });
    closeModal('overlay-generic');
    toast('Comunicado enviado!','success');
    renderCampanhas();
  }

  function deleteComunicado(id) {
    FriomacData.deleteComunicado(id);
    toast('Comunicado removido.','info');
    renderCampanhas();
  }

  function marcarComunicadoLido(id) {
    const user = FriomacData.getUser();
    if(user) FriomacData.markComunicadoLido(id, user.id);
    renderCampanhas();
  }

  // ══════════════════════════════════════════════════
  // COMISSÕES
  // ══════════════════════════════════════════════════
  let _comFiltro = { vendedor: '', canal: '', periodo: '' };

  function renderComissoes() {
    const todasCom = FriomacData.getComissoes(_comFiltro);
    const reps     = FriomacData.getReps();
    const fmt      = FriomacData.formatCurrency.bind(FriomacData);

    const pendentes = todasCom.filter(c => c.statusPgto !== 'PAGO');
    const pagas     = todasCom.filter(c => c.statusPgto === 'PAGO');
    const totalPend = pendentes.reduce((s,c)=>s+(c.valorCom||0),0);
    const totalPago = pagas.reduce((s,c)=>s+(c.valorCom||0),0);
    const totalGeral= totalPend + totalPago;

    const repOptions = reps.map(r=>`<option value="${r.nome}" ${_comFiltro.vendedor===r.nome?'selected':''}>${r.nome}</option>`).join('');

    function comRow(c, isPago) {
      const lead = c.norcamento ? FriomacData.getLeadById(c.norcamento) : null;
      const hasProof = !!FriomacData.getComissaoComprovante(c.id);
      return `<tr>
        <td style="font-family:monospace;font-size:.8rem">#${c.norcamento||'—'}</td>
        <td><div style="font-weight:700">${c.cliente||'—'}</div></td>
        <td>${c.vendedor||'—'}</td>
        <td style="font-weight:700;color:var(--primary)">${fmt(c.valorOrc||0)}</td>
        <td style="text-align:center">${c.pct||0}%</td>
        <td style="font-weight:800;color:var(--success)">${fmt(c.valorCom||0)}</td>
        ${isPago ? `
        <td style="font-size:.8rem">${FriomacData.formatDate(c.dataPgto)||'—'}</td>
        <td>
          <div style="display:flex;gap:6px">
            ${hasProof?`<button class="btn btn-ghost btn-sm" onclick="App.verComissaoDetalhe('${c.id}')">Ver comprovante</button>`:'<span style="font-size:.75rem;color:var(--text-3)">Sem comprovante</span>'}
            ${lead?`<button class="btn btn-ghost btn-sm" onclick="App.openLeadModal('${lead.id}')">Ver pedido</button>`:''}
          </div>
        </td>` : `
        <td><span class="badge badge-warning">${c.statusPgto||'PENDENTE'}</span></td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="App.abrirPagamentoModal('${c.id}')">Marcar Pago</button>
        </td>`}
      </tr>`;
    }

    document.getElementById('screen-comissoes').innerHTML = `
    <div class="commission-summary">
      <div class="kpi-card blue" style="margin:0">
        <div class="kpi-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
        <div class="kpi-value">${fmt(totalGeral)}</div>
        <div class="kpi-label">Total em Comissões</div>
      </div>
      <div class="kpi-card orange" style="margin:0">
        <div class="kpi-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <div class="kpi-value">${fmt(totalPend)}</div>
        <div class="kpi-label">Pendentes</div>
      </div>
      <div class="kpi-card green" style="margin:0">
        <div class="kpi-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div class="kpi-value">${fmt(totalPago)}</div>
        <div class="kpi-label">Total Pago</div>
      </div>
    </div>

    <!-- FILTROS -->
    <div class="toolbar" style="flex-wrap:wrap;gap:8px;margin-bottom:20px">
      <select class="form-control" style="width:auto" id="com-fil-vend" onchange="App.filtrarComissoes()">
        <option value="">Todos vendedores</option>
        <option value="__proprio" ${_comFiltro.canal==='Canal Próprio'?'selected':''}>Canal Próprio</option>
        <option value="__rep"     ${_comFiltro.canal==='Representante'?'selected':''}>Representantes</option>
        ${repOptions}
      </select>
      <select class="form-control" style="width:auto" id="com-fil-per" onchange="App.filtrarComissoes()">
        <option value="">Todo período</option>
        <option value="30"  ${_comFiltro.periodo==='30' ?'selected':''}>Últimos 30 dias</option>
        <option value="12m" ${_comFiltro.periodo==='12m'?'selected':''}>Últimos 12 meses</option>
      </select>
      ${(_comFiltro.vendedor||_comFiltro.canal||_comFiltro.periodo)?`<button class="btn btn-ghost btn-sm" onclick="App.limparFiltrosCom()">✕ Limpar filtros</button>`:''}
    </div>

    <!-- PENDENTES -->
    <div class="section-title" style="margin-bottom:12px">⏳ Comissões Pendentes (${pendentes.length})</div>
    <div class="card" style="margin-bottom:24px">
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Nº Orç</th><th>Cliente</th><th>Vendedor</th><th>Valor Orçado</th><th>%</th><th>Comissão</th><th>Status</th><th>Ação</th></tr></thead>
          <tbody>
            ${pendentes.length
              ? pendentes.map(c=>comRow(c,false)).join('')
              : `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-3)">
                  ${todasCom.length===0?'Nenhuma comissão ainda. Comissões são geradas automaticamente ao concluir uma venda no Kanban.':'Nenhuma comissão pendente.'}
                 </td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <!-- PAGAS -->
    <div class="section-title" style="margin-bottom:12px">✅ Comissões Pagas (${pagas.length})</div>
    <div class="card">
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Nº Orç</th><th>Cliente</th><th>Vendedor</th><th>Valor Orçado</th><th>%</th><th>Comissão</th><th>Data Pgto</th><th>Comprovante / Pedido</th></tr></thead>
          <tbody>
            ${pagas.length
              ? pagas.map(c=>comRow(c,true)).join('')
              : `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-3)">Nenhuma comissão paga ainda.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  function filtrarComissoes() {
    const sel = document.getElementById('com-fil-vend')?.value || '';
    if (sel === '__proprio') { _comFiltro = { canal: 'Canal Próprio', vendedor: '', periodo: _comFiltro.periodo }; }
    else if (sel === '__rep') { _comFiltro = { canal: 'Representante', vendedor: '', periodo: _comFiltro.periodo }; }
    else { _comFiltro = { canal: '', vendedor: sel, periodo: _comFiltro.periodo }; }
    _comFiltro.periodo = document.getElementById('com-fil-per')?.value || '';
    renderComissoes();
  }

  function limparFiltrosCom() {
    _comFiltro = { vendedor: '', canal: '', periodo: '' };
    renderComissoes();
  }

  // Modal de pagamento com comprovante obrigatório
  function abrirPagamentoModal(comId) {
    const com = FriomacData.getComissaoById(comId);
    if (!com) return;
    const fmt = FriomacData.formatCurrency.bind(FriomacData);
    App._pgtoFileData = null;

    document.getElementById('modal-generic').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">💳 Registrar Pagamento de Comissão</div>
      <button class="btn-close" onclick="App.closeModal('overlay-generic')">✕</button>
    </div>
    <div class="modal-body">
      <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:18px;font-size:.84rem">
        <div style="display:flex;gap:20px;flex-wrap:wrap">
          <span><strong>Vendedor:</strong> ${com.vendedor||'—'}</span>
          <span><strong>Cliente:</strong> ${com.cliente||'—'}</span>
          <span><strong>Orç:</strong> #${com.norcamento||'—'}</span>
          <span><strong>Valor:</strong> <span style="color:var(--success);font-weight:800">${fmt(com.valorCom||0)}</span></span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Data do Pagamento *</label>
        <input class="form-control" id="pgto-data" type="date" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label class="form-label">Observação</label>
        <input class="form-control" id="pgto-obs" placeholder="Ex: TED, PIX, número do comprovante...">
      </div>
      <div class="form-group">
        <label class="form-label">Comprovante de Pagamento *</label>
        <div style="display:flex;align-items:center;gap:12px;margin-top:4px">
          <button class="btn btn-ghost btn-sm" onclick="App._pickComprovanteFile('${comId}')">📎 Selecionar arquivo</button>
          <span id="pgto-file-label" style="font-size:.8rem;color:var(--text-3)">Nenhum arquivo selecionado</span>
        </div>
        <div id="pgto-file-preview" style="display:none;margin-top:10px;padding:10px;background:var(--success-bg);border-radius:var(--radius);border:1px solid var(--success);font-size:.82rem;color:var(--success)">
          ✓ Comprovante anexado
        </div>
        <p style="font-size:.75rem;color:var(--danger);margin-top:6px" id="pgto-file-warning">⚠ O comprovante é obrigatório para confirmar o pagamento.</p>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="App.closeModal('overlay-generic')">Cancelar</button>
      <button class="btn btn-accent" id="btn-confirmar-pgto" disabled style="opacity:.5;cursor:not-allowed" onclick="App.confirmarPagamento('${comId}')">Confirmar Pagamento</button>
    </div>`;
    openModal('overlay-generic');
  }

  function _pickComprovanteFile(comId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf,.jpg,.png,.pdf';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 15*1024*1024) { toast('Arquivo muito grande. Máx 15 MB.','warning'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        App._pgtoFileData = { nome: file.name, tipo: file.type, base64: ev.target.result };
        document.getElementById('pgto-file-label').textContent = file.name;
        document.getElementById('pgto-file-preview').style.display = 'block';
        document.getElementById('pgto-file-warning').style.display = 'none';
        const btn = document.getElementById('btn-confirmar-pgto');
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function confirmarPagamento(comId) {
    if (!App._pgtoFileData) { toast('Anexe o comprovante de pagamento.','warning'); return; }
    const data = document.getElementById('pgto-data')?.value;
    const obs  = document.getElementById('pgto-obs')?.value?.trim();
    if (!data) { toast('Informe a data do pagamento.','warning'); return; }
    FriomacData.setComissaoComprovante(comId, App._pgtoFileData.base64);
    FriomacData.updateComissao(comId, {
      statusPgto: 'PAGO',
      dataPgto:   data,
      obsPgto:    obs,
      nomeComprovante: App._pgtoFileData.nome,
    });
    App._pgtoFileData = null;
    closeModal('overlay-generic');
    toast('Pagamento confirmado e comprovante salvo!', 'success', 4000);
    renderComissoes();
  }

  function verComissaoDetalhe(comId) {
    const com  = FriomacData.getComissaoById(comId);
    if (!com) return;
    const fmt  = FriomacData.formatCurrency.bind(FriomacData);
    const lead = com.norcamento ? FriomacData.getLeadById(com.norcamento) : null;
    const proof = FriomacData.getComissaoComprovante(comId);
    const isImg = com.nomeComprovante && /\.(png|jpg|jpeg|gif|webp)/i.test(com.nomeComprovante);

    document.getElementById('modal-generic').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">💰 Detalhe da Comissão Paga</div>
      <button class="btn-close" onclick="App.closeModal('overlay-generic')">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
        ${[
          ['Vendedor',   com.vendedor||'—'],
          ['Cliente',    com.cliente||'—'],
          ['Orçamento',  '#'+(com.norcamento||'—')],
          ['Valor Orçado', fmt(com.valorOrc||0)],
          ['% Comissão', (com.pct||0)+'%'],
          ['Valor Comissão', fmt(com.valorCom||0)],
          ['Data Pagamento', FriomacData.formatDate(com.dataPgto)||'—'],
          ['Observação',   com.obsPgto||'—'],
        ].map(([k,v])=>`<div><div style="font-size:.72rem;text-transform:uppercase;color:var(--text-3);font-weight:600">${k}</div><div style="font-weight:700;color:var(--text-1)">${v}</div></div>`).join('')}
      </div>
      ${lead ? `
      <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:12px;margin-bottom:16px;font-size:.83rem">
        <strong>Pedido Vinculado — Orç #${lead.id}</strong><br>
        ${lead.projeto||'S/P'} · ${lead.nomFantasia||lead.cliente||'—'}<br>
        Valor final: <strong>${fmt(lead.valorFinal||lead.valor)}</strong> · Forma pgto: ${lead.formaPagamento||'—'}
      </div>` : ''}
      <div class="form-section-title">Comprovante de Pagamento</div>
      ${proof ? `
        ${isImg ? `<img src="${proof}" style="max-width:100%;border-radius:var(--radius);border:1px solid var(--border);margin-bottom:10px">` : ''}
        <button class="btn btn-ghost btn-sm" onclick="App._downloadProof('${comId}','${_v(com.nomeComprovante||'comprovante')}')">⬇ Baixar ${com.nomeComprovante||'comprovante'}</button>
      ` : '<p style="color:var(--text-3);font-size:.82rem">Comprovante não disponível.</p>'}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="App.closeModal('overlay-generic')">Fechar</button>
      ${lead?`<button class="btn btn-accent btn-sm" onclick="App.closeModal('overlay-generic');App.openLeadModal('${lead.id}')">Ver Lead Completo</button>`:''}
    </div>`;
    openModal('overlay-generic');
  }

  function _downloadProof(comId, nome) {
    const data = FriomacData.getComissaoComprovante(comId);
    if (!data) { toast('Arquivo não disponível.','warning'); return; }
    const link = document.createElement('a');
    link.href = data; link.download = nome; link.click();
  }

  // Kept for data compat — no longer called from UI
  function openNewComissaoModal() {}
  function createComissao() {}
  function pagarComissao(id) {}

  // ══════════════════════════════════════════════════
  // PRAZO ENTREGA
  // ══════════════════════════════════════════════════
  function renderPrazo() {
    const entregas = FriomacData.getEntregas();
    const leads    = FriomacData.getLeads();
    const fmt      = FriomacData.formatCurrency.bind(FriomacData);
    const atrasadas = entregas.filter(e=>e.diasAtraso>0).length;

    document.getElementById('screen-prazo').innerHTML = `
    ${atrasadas > 0 ? `
    <div class="delivery-alert">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <strong>${atrasadas} entrega(s) atrasada(s)!</strong> Verificar imediatamente e acionar time de produção.
    </div>` : ''}

    <div class="stats-row">
      <div class="stat-mini"><strong>${entregas.length}</strong><span>Entregas registradas</span></div>
      <div class="stat-mini"><strong style="color:var(--success)">${entregas.filter(e=>e.statusEntrega==='ENTREGUE').length}</strong><span>Entregues no prazo</span></div>
      <div class="stat-mini"><strong style="color:var(--danger)">${atrasadas}</strong><span>Atrasadas</span></div>
      <div class="stat-mini"><strong style="color:var(--warning)">${entregas.filter(e=>e.statusEntrega==='EM PRODUCAO').length}</strong><span>Em produção</span></div>
    </div>

    <div class="toolbar">
      <div class="section-title">📦 Controle de Prazo de Entrega</div>
      <div style="margin-left:auto">
        <button class="btn btn-accent btn-sm" onclick="App.openNewEntregaModal()">+ Nova Entrega</button>
      </div>
    </div>

    <div class="card">
      <div style="padding:14px 18px;background:var(--surface-2);border-bottom:1px solid var(--border);font-size:.78rem;color:var(--text-2)">
        ⚠️ <strong>POLÍTICA FRIOMAC:</strong> 98% de entregas no prazo | Multa contratual por dia de atraso | Garantia de entrega = diferencial Friomac
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr>
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
          </tr></thead>
          <tbody id="entrega-tbody">
            ${entregas.length === 0
              ? `<tr><td colspan="12">
                  <div class="empty-state" style="padding:50px">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                    <h3>Nenhuma entrega registrada</h3>
                    <p>Clique em "+ Nova Entrega" para começar a monitorar os prazos contratuais.</p>
                  </div>
                </td></tr>`
              : entregas.map(e => `
              <tr>
                <td style="font-family:monospace">#${e.norcamento||'—'}</td>
                <td style="font-weight:700">${e.cliente||'—'}</td>
                <td>${e.vendedor||'—'}</td>
                <td>${FriomacData.formatDate(e.dataPedido)}</td>
                <td>${FriomacData.formatDate(e.dataPrevEntrega)}</td>
                <td>${e.dataRealEntrega ? FriomacData.formatDate(e.dataRealEntrega) : '<span style="color:var(--text-3)">—</span>'}</td>
                <td><span class="badge ${e.diasAtraso>0?'badge-danger':'badge-success'}">${e.diasAtraso>0?'+'+e.diasAtraso+'d':'No prazo'}</span></td>
                <td><span class="badge ${e.statusEntrega==='ENTREGUE'?'badge-success':e.statusEntrega==='ATRASADA'?'badge-danger':'badge-warning'}">${e.statusEntrega}</span></td>
                <td>${e.multaDia ? fmt(e.multaDia) : '—'}</td>
                <td style="${e.multaTotal>0?'color:var(--danger);font-weight:700':''}">${e.multaTotal ? fmt(e.multaTotal) : '—'}</td>
                <td>${'⭐'.repeat(e.satisfacao||0)}</td>
                <td>
                  <button class="btn btn-ghost btn-sm" onclick="App.openEditEntregaModal('${e.id}')">Editar</button>
                </td>
              </tr>`).join('')
            }
          </tbody>
        </table>
      </div>
    </div>`;
  }

  function openNewEntregaModal() {
    const leads = FriomacData.getLeads();
    const reps  = FriomacData.getReps();
    document.getElementById('modal-generic').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">+ Nova Entrega</div>
      <button class="btn-close" onclick="App.closeModal('overlay-generic')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Orçamento Vinculado</label>
          <select class="form-control" id="ne-orc">
            <option value="">Selecione...</option>
            ${leads.map(l=>`<option value="${l.id}">#${l.id} — ${l.nomFantasia||l.cliente}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Vendedor</label>
          <select class="form-control" id="ne-vend">
            <option value="">—</option>
            ${reps.map(r=>`<option value="${r.nome}">${r.nome}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Data do Pedido</label><input class="form-control" id="ne-dtped" type="date"></div>
        <div class="form-group"><label class="form-label">Data Prev. Entrega *</label><input class="form-control" id="ne-dtprev" type="date"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Data Real Entrega</label><input class="form-control" id="ne-dtreal" type="date"></div>
        <div class="form-group"><label class="form-label">Status</label>
          <select class="form-control" id="ne-status">
            <option>EM PRODUCAO</option><option>AGUARDANDO</option><option>ENTREGUE</option><option>ATRASADA</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Multa por Dia (R$)</label><input class="form-control" id="ne-multa" type="number" placeholder="0" min="0"></div>
        <div class="form-group"><label class="form-label">Satisfação (1-5)</label>
          <select class="form-control" id="ne-sat">
            <option value="5">⭐⭐⭐⭐⭐</option><option value="4">⭐⭐⭐⭐</option>
            <option value="3">⭐⭐⭐</option><option value="2">⭐⭐</option><option value="1">⭐</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Observações</label><textarea class="form-control" id="ne-obs" rows="2"></textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="App.closeModal('overlay-generic')">Cancelar</button>
      <button class="btn btn-accent" onclick="App.createEntrega()">Registrar Entrega</button>
    </div>`;
    openModal('overlay-generic');
  }

  function createEntrega() {
    const orcId = document.getElementById('ne-orc')?.value;
    const lead  = orcId ? FriomacData.getLeadById(orcId) : null;
    const dtPrev  = document.getElementById('ne-dtprev')?.value;
    const dtReal  = document.getElementById('ne-dtreal')?.value;
    if (!dtPrev) { toast('Informe a data prevista de entrega.', 'warning'); return; }

    let diasAtraso = 0;
    let multaDia   = parseFloat(document.getElementById('ne-multa')?.value||0);
    if (dtReal && dtReal > dtPrev) {
      const diff = new Date(dtReal) - new Date(dtPrev);
      diasAtraso = Math.ceil(diff / 86400000);
    }

    FriomacData.addEntrega({
      norcamento: orcId,
      cliente: lead?.nomFantasia || lead?.cliente || '',
      vendedor: document.getElementById('ne-vend')?.value,
      dataPedido: document.getElementById('ne-dtped')?.value,
      dataPrevEntrega: dtPrev,
      dataRealEntrega: dtReal || null,
      statusEntrega: document.getElementById('ne-status')?.value,
      multaDia,
      multaTotal: diasAtraso * multaDia,
      diasAtraso,
      satisfacao: parseInt(document.getElementById('ne-sat')?.value||5),
      obs: document.getElementById('ne-obs')?.value?.trim(),
    });
    closeModal('overlay-generic');
    toast('Entrega registrada!', 'success');
    renderPrazo();
  }

  // ══════════════════════════════════════════════════
  // CONFIG
  // ══════════════════════════════════════════════════
  function renderConfig() {
    document.getElementById('screen-config').innerHTML = `
    <div class="tab-bar">
      <button class="tab-btn active">⚙️ Geral</button>
      <button class="tab-btn">🔗 Integrações</button>
      <button class="tab-btn">👥 Usuários</button>
      <button class="tab-btn">🔔 Alertas</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <!-- SISTEMA -->
      <div class="card">
        <div class="card-header"><div class="card-title">⚙️ Configurações do Sistema</div></div>
        <div class="card-body">
          <div class="form-group"><label class="form-label">Nome da Empresa</label><input class="form-control" value="Friomac Indústria e Comércio de Refrigeração"></div>
          <div class="form-group"><label class="form-label">Meta Anual (R$)</label><input class="form-control" type="number" value="12000000"></div>
          <div class="form-group"><label class="form-label">Taxa de Conversão Meta (%)</label><input class="form-control" type="number" value="35"></div>
          <div class="form-group"><label class="form-label">Ticket Médio Meta (R$)</label><input class="form-control" type="number" value="130000"></div>
          <div style="display:flex;gap:10px;margin-top:16px">
            <button class="btn btn-accent" onclick="App.toast('Configurações salvas!','success')">Salvar configurações</button>
            <button class="btn btn-danger btn-sm" onclick="if(confirm('Resetar todos os dados?')){FriomacData.resetData();App.toast('Dados resetados!','warning');App.renderScreen('dashboard')}">Reset dados</button>
          </div>
        </div>
      </div>

      <!-- INTEGRAÇÕES -->
      <div class="card">
        <div class="card-header"><div class="card-title">🔗 Integrações & APIs</div></div>
        <div class="card-body">
          <div class="integration-grid" style="grid-template-columns:1fr 1fr">
            ${[
              { icon:'📸', nome:'Instagram', desc:'Leads via DM', color:'#E1306C' },
              { icon:'💬', nome:'WhatsApp',  desc:'Business API', color:'#25D366' },
              { icon:'📘', nome:'Facebook',  desc:'Leads Ads',    color:'#1877F2' },
              { icon:'🔍', nome:'Google Ads', desc:'Conversões',  color:'#4285F4' },
              { icon:'📧', nome:'Email',     desc:'SMTP/IMAP',    color:'#EA4335' },
              { icon:'📊', nome:'RD Station', desc:'Marketing',   color:'#00BFA5' },
            ].map(i=>`
            <div class="integration-card">
              <div class="integration-icon" style="background:${i.color}20;font-size:1.6rem">${i.icon}</div>
              <h4>${i.nome}</h4>
              <p>${i.desc}</p>
              <div class="toggle-wrap" style="justify-content:center">
                <label class="toggle"><input type="checkbox"><span class="toggle-slider"></span></label>
                <span style="font-size:.75rem;color:var(--text-3)">Ativo</span>
              </div>
            </div>`).join('')}
          </div>
          <div style="margin-top:16px">
            <label class="form-label">API Key (Integração)</label>
            <input class="form-control" type="password" value="••••••••••••••••••••••••••••••••" readonly>
          </div>
          <div style="margin-top:10px">
            <label class="form-label">Webhook URL (receber leads)</label>
            <input class="form-control" value="https://crm.friomac.ind.br/api/leads/webhook" readonly>
          </div>
        </div>
      </div>
    </div>

    <!-- USUÁRIOS -->
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">👥 Usuários do Sistema</div><button class="btn btn-accent btn-sm">+ Novo Usuário</button></div>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Grupo</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            ${FriomacData.getUsers().map(u=>`
            <tr>
              <td><div style="display:flex;align-items:center;gap:10px">
                <div class="user-avatar" style="width:28px;height:28px;font-size:.72rem">${u.avatar}</div>
                <strong>${u.nome}</strong>
              </div></td>
              <td style="font-size:.82rem">${u.email}</td>
              <td><span class="badge ${u.role==='master'?'badge-danger':u.role==='vendedor'?'badge-primary':'badge-purple'}">${{master:'Administrador',vendedor:'Vendedor',representante:'Representante'}[u.role]}</span></td>
              <td style="font-size:.82rem">${u.grupo}</td>
              <td><span class="badge badge-success">Ativo</span></td>
              <td><button class="btn btn-ghost btn-sm">Editar</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ALERTAS SLA -->
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">🔔 Configurações de Alertas</div></div>
      <div class="card-body">
        <div class="form-row">
          ${[
            { label:'SLA Contato Recebido', desc:'Alerta após 2h sem resposta', val:'2' },
            { label:'SLA Visita In Loco', desc:'Alerta após 72h sem agendamento', val:'72' },
            { label:'SLA Orçamento', desc:'Alerta após 24h sem envio', val:'24' },
            { label:'Lead sem atividade', desc:'Alerta após N dias parado', val:'7' },
          ].map(a=>`
          <div class="form-group">
            <label class="form-label">${a.label}</label>
            <div style="display:flex;gap:8px;align-items:center">
              <input class="form-control" type="number" value="${a.val}" style="width:80px">
              <span style="font-size:.8rem;color:var(--text-3)">${a.desc}</span>
            </div>
          </div>`).join('')}
        </div>
        <button class="btn btn-accent" onclick="App.toast('Alertas salvos!','success')">Salvar alertas</button>
      </div>
    </div>`;
  }

  // ── MODAL UTILS ────────────────────────────────────
  function openModal(overlayId) {
    document.getElementById(overlayId)?.classList.add('open');
  }

  function closeModal(overlayId) {
    document.getElementById(overlayId)?.classList.remove('open');
  }

  function openEditEntregaModal(id) {
    const e       = FriomacData.getEntregas().find(x=>x.id===id);
    if (!e) return;
    const isAdmin = FriomacData.getUser()?.role === 'master';
    const fmt     = FriomacData.formatCurrency.bind(FriomacData);

    document.getElementById('modal-generic').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">📦 Entrega — Orç #${e.norcamento||'—'} · ${e.cliente||'—'}</div>
      <button class="btn-close" onclick="App.closeModal('overlay-generic')">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;font-size:.83rem">
        <div><span style="color:var(--text-3)">Cliente:</span> <strong>${e.cliente||'—'}</strong></div>
        <div><span style="color:var(--text-3)">Vendedor:</span> <strong>${e.vendedor||'—'}</strong></div>
        <div><span style="color:var(--text-3)">Data pedido:</span> <strong>${FriomacData.formatDate(e.dataPedido)||'—'}</strong></div>
        <div><span style="color:var(--text-3)">Previsão:</span> <strong>${FriomacData.formatDate(e.dataPrevEntrega)||'—'}</strong></div>
        <div><span style="color:var(--text-3)">Valor contrato:</span> <strong style="color:var(--primary)">${fmt(e.valorContrato||0)}</strong></div>
        <div><span style="color:var(--text-3)">Forma pgto:</span> <strong>${e.formaPagamento||'—'}</strong></div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-control" id="ee-status" ${!isAdmin?'disabled':''}>
            <option ${e.statusEntrega==='EM PRODUCAO'?'selected':''}>EM PRODUCAO</option>
            <option ${e.statusEntrega==='AGUARDANDO'?'selected':''}>AGUARDANDO</option>
            <option ${e.statusEntrega==='ENTREGUE'?'selected':''}>ENTREGUE</option>
            <option ${e.statusEntrega==='ATRASADA'?'selected':''}>ATRASADA</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Satisfação do Cliente</label>
          <select class="form-control" id="ee-sat">
            <option value="5" ${e.satisfacao===5?'selected':''}>⭐⭐⭐⭐⭐</option>
            <option value="4" ${e.satisfacao===4?'selected':''}>⭐⭐⭐⭐</option>
            <option value="3" ${e.satisfacao===3?'selected':''}>⭐⭐⭐</option>
            <option value="2" ${e.satisfacao===2?'selected':''}>⭐⭐</option>
            <option value="1" ${e.satisfacao===1?'selected':''}>⭐</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">
          Data Real de Entrega
          ${!isAdmin ? '<span style="margin-left:6px;font-size:.72rem;color:var(--warning);font-weight:600">🔒 Somente administrador</span>' : '<span style="margin-left:6px;font-size:.72rem;color:var(--success)">✓ Admin</span>'}
        </label>
        <input class="form-control" id="ee-dtreal" type="date" value="${e.dataRealEntrega||''}" ${!isAdmin?'disabled readonly':''}>
        ${!isAdmin?'<p style="font-size:.75rem;color:var(--text-3);margin-top:4px">A data de conclusão da entrega só pode ser registrada pelo administrador do sistema.</p>':''}
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Multa por Dia de Atraso (R$)</label>
          <input class="form-control" id="ee-multa" type="number" min="0" value="${e.multaDia||0}" ${!isAdmin?'disabled':''}>
        </div>
        <div class="form-group">
          <label class="form-label">Dias de Atraso</label>
          <input class="form-control" id="ee-atraso" type="number" min="0" value="${e.diasAtraso||0}" disabled>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Observações</label>
        <textarea class="form-control" id="ee-obs" rows="3" style="resize:vertical">${e.obs||''}</textarea>
      </div>

      ${e.multaTotal>0?`<div style="background:var(--danger-bg);border:1px solid var(--danger);border-radius:var(--radius);padding:10px;font-size:.84rem;color:var(--danger)">
        ⚠ Multa acumulada: <strong>${fmt(e.multaTotal)}</strong> (${e.diasAtraso} dia(s) × ${fmt(e.multaDia)})
      </div>`:''}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="App.closeModal('overlay-generic')">Cancelar</button>
      <button class="btn btn-accent" onclick="App.saveEntrega('${id}')">Salvar</button>
    </div>`;
    openModal('overlay-generic');
  }

  function saveEntrega(id) {
    const e         = FriomacData.getEntregas().find(x=>x.id===id);
    const isAdmin   = FriomacData.getUser()?.role === 'master';
    const dtPrev    = e?.dataPrevEntrega || '';
    const dtReal    = isAdmin ? (document.getElementById('ee-dtreal')?.value||null) : e?.dataRealEntrega;
    let diasAtraso  = 0, multaTotal = 0;
    const multaDia  = isAdmin ? parseFloat(document.getElementById('ee-multa')?.value||0) : (e?.multaDia||0);
    if (dtReal && dtPrev && dtReal > dtPrev) {
      diasAtraso = Math.ceil((new Date(dtReal)-new Date(dtPrev))/86400000);
      multaTotal = diasAtraso * multaDia;
    }
    const updates = {
      obs:            document.getElementById('ee-obs')?.value?.trim(),
      satisfacao:     parseInt(document.getElementById('ee-sat')?.value||5),
    };
    if (isAdmin) {
      updates.statusEntrega   = document.getElementById('ee-status')?.value;
      updates.dataRealEntrega = dtReal;
      updates.multaDia        = multaDia;
      updates.diasAtraso      = diasAtraso;
      updates.multaTotal      = multaTotal;
      if (dtReal && !diasAtraso) updates.statusEntrega = 'ENTREGUE';
    }
    FriomacData.updateEntrega(id, updates);
    closeModal('overlay-generic');
    toast('Entrega atualizada!', 'success');
    renderPrazo();
  }

  // ── INIT ───────────────────────────────────────────
  function init() {
    FriomacData.init();

    // Login form
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.querySelectorAll('.login-user-btn').forEach(btn => {
      btn.addEventListener('click', () => quickLogin(btn.dataset.email));
    });

    // Sidebar nav
    document.querySelectorAll('.nav-item[data-screen]').forEach(item => {
      item.addEventListener('click', () => navigateTo(item.dataset.screen));
    });

    // Sidebar toggle
    document.getElementById('btn-toggle-sidebar')?.addEventListener('click', toggleSidebar);

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', handleLogout);

    // Modal overlay close
    document.querySelectorAll('.modal-overlay').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target === el) el.classList.remove('open');
      });
    });

    // Header user click
    document.getElementById('header-user-wrap')?.addEventListener('click', () => {
      toast('Perfil do usuário — em desenvolvimento', 'info');
    });

    showLogin();
  }

  // ── PUBLIC API ─────────────────────────────────────
  return {
    init,
    navigateTo,
    renderScreen,
    toggleSidebar,
    toast,
    // Kanban
    kanbanFilter,
    toggleKanbanFilter,
    clearKanbanFilters,
    advanceLead,
    onDragOver,
    onDragLeave,
    onDrop,
    // Lead
    openLeadModal,
    saveLead,
    deleteLead,
    moveLeadStage,
    openNewLeadModal,
    createNewLead,
    switchModalTab,
    // Observações
    postObservacao,
    // Anexos
    handleFileAttach,
    downloadAnexo,
    removeAnexoFromLead,
    // Outcomes
    showOutcomeDialog,
    showGanhoForm,
    showPerdidoForm,
    calcComissao,
    doGanho,
    doPerdido,
    reativarLead,
    // Clientes
    searchClientes,
    setCliSort,
    deleteCliente,
    openEditClienteModal,
    saveCliente,
    switchCliTab,
    downloadAnexoFromLead,
    // Orcamentos
    searchOrcamentos,
    filterOrcamentos,
    // Vendedores
    tabVend,
    openNewRepModal,
    createRep,
    openEditRepModal,
    saveRep,
    switchRepTab,
    confirmarInativarRep,
    inativarRep,
    ativarRep,
    handleRepFileAttach,
    downloadRepAnexo,
    removeRepAnexo,
    // Campanhas
    renderCampanhas,
    switchCampTab,
    openNewCampanhaModal,
    openEditCampanhaModal,
    createCampanha,
    saveCampanha,
    deleteCampanha,
    openNovaSolicModal,
    createSolicMkt,
    updateSolicMkt,
    uploadRepoItem,
    _repoPickFile,
    saveRepoItem,
    downloadRepoItem,
    deleteRepoItem,
    openNovoComunicadoModal,
    createComunicado,
    deleteComunicado,
    marcarComunicadoLido,
    // Comissões
    filtrarComissoes,
    limparFiltrosCom,
    abrirPagamentoModal,
    _pickComprovanteFile,
    confirmarPagamento,
    verComissaoDetalhe,
    _downloadProof,
    openNewComissaoModal,
    createComissao,
    pagarComissao,
    // Prazo
    openNewEntregaModal,
    createEntrega,
    openEditEntregaModal,
    saveEntrega,
    // Config
    renderConfig,
    // Utils
    openModal,
    closeModal,
  };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
