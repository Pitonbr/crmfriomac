/* =====================================================
   FRIOMAC CRM — Data Store
   Dados importados da Planilha Mestre Abril 2026
   ===================================================== */

const FriomacData = (function() {

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

  // ── USUÁRIOS — SEED INICIAL ──────────────────────────
  // Perfil Vendedor: vê apenas dados próprios
  const _VEND_MENUS  = ['dashboard','kanban','orcamentos','campanhas','config'];
  const _VEND_ACESSO = { dashboard:'visualizacao', kanban:'edicao', orcamentos:'edicao', campanhas:'visualizacao', config:'edicao' };
  // Perfil Representante: vê apenas dados próprios
  const _REP_MENUS   = ['dashboard','kanban','campanhas','config'];
  const _REP_ACESSO  = { dashboard:'visualizacao', kanban:'edicao', campanhas:'visualizacao', config:'edicao' };

  // Perfis pré-definidos para aplicar na criação de usuários
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

  const USERS_SEED = [
    { id:'u_master1', nome:'Alex Piton',              cargo:'Sócio Administrador', email:'admin@friomac.ind.br',     telefone:'', login:'alex.piton',        senha:'Friomac@1', role:'master',       avatar:'AP', grupo:'Gestão',        menuPermissoes:ALL_MENUS, tipoAcesso:{...ALL_EDIT}, ativo:true, senhaTemporaria:false, dataCadastro:'2026-04-28', criadoPor:null },
    { id:'u_master2', nome:'Ale Munoz',               cargo:'Sócio Administrador', email:'alemunoz@uol.com.br',      telefone:'', login:'ale.munoz',         senha:'Friomac@2', role:'master',       avatar:'AM', grupo:'Gestão',        menuPermissoes:ALL_MENUS, tipoAcesso:{...ALL_EDIT}, ativo:true, senhaTemporaria:false, dataCadastro:'2026-04-28', criadoPor:null },
    { id:'u2', nome:'Caio Victor Volpiano',           cargo:'Vendedor',      email:'caio@friomac.ind.br',      telefone:'(11) 99999-0001', login:'caio.victor',       senha:'123456', role:'vendedor',     repId:'r1', avatar:'CV', grupo:'Canal Próprio',  menuPermissoes:[..._VEND_MENUS], tipoAcesso:{..._VEND_ACESSO}, ativo:true, senhaTemporaria:true, dataCadastro:'2026-04-28', criadoPor:'u_master1' },
    { id:'u3', nome:'Felipe Crescente Alves Maciel', cargo:'Vendedor',      email:'felipe@friomac.ind.br',    telefone:'(11) 99999-0002', login:'felipe.crescente',   senha:'123456', role:'vendedor',     repId:'r2', avatar:'FC', grupo:'Canal Próprio',  menuPermissoes:[..._VEND_MENUS], tipoAcesso:{..._VEND_ACESSO}, ativo:true, senhaTemporaria:true, dataCadastro:'2026-04-28', criadoPor:'u_master1' },
    { id:'u4', nome:'Lauriberto Volpiano',            cargo:'Representante', email:'lauriberto@friomac.ind.br',telefone:'', login:'lauriberto.volpiano', senha:'123456', role:'representante', repId:'r6', avatar:'LV', grupo:'Representantes', menuPermissoes:[..._REP_MENUS],  tipoAcesso:{..._REP_ACESSO},  ativo:true, senhaTemporaria:true, dataCadastro:'2026-04-28', criadoPor:'u_master1' },
    { id:'u5', nome:'Pedro Taconelli Gallucci',       cargo:'Vendedor',      email:'pedro@friomac.ind.br',     telefone:'', login:'pedro.gallucci',    senha:'123456', role:'vendedor',     repId:'r4', avatar:'PG', grupo:'Canal Próprio',  menuPermissoes:[..._VEND_MENUS], tipoAcesso:{..._VEND_ACESSO}, ativo:true, senhaTemporaria:true, dataCadastro:'2026-04-28', criadoPor:'u_master1' },
  ];

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

  // ── REPRESENTANTES ───────────────────────────────────
  const REPS_BASE = [
    { id: 'r1',  nome: 'Caio Victor Volpiano',                       canal: 'Canal Próprio',  qtdOrc: 4,  totalOrc: 149280,  fechados: 0, totalFech: 0, comissao: 3.5, cidade: 'São Paulo', estado: 'SP', email: 'caio@friomac.ind.br', tel: '(11) 99999-0001' },
    { id: 'r2',  nome: 'Felipe Crescente Alves Maciel',              canal: 'Canal Próprio',  qtdOrc: 1,  totalOrc: 92350,   fechados: 0, totalFech: 0, comissao: 3.5, cidade: 'São Paulo', estado: 'SP', email: 'felipe@friomac.ind.br', tel: '(11) 99999-0002' },
    { id: 'r3',  nome: 'Centrato (Leonardo Representante)',          canal: 'Representante',  qtdOrc: 0,  totalOrc: 0,      fechados: 0, totalFech: 0, comissao: 5.0, cidade: 'Ribeirão Preto', estado: 'SP', email: 'centrato@rep.com.br', tel: '' },
    { id: 'r4',  nome: 'Pedro Taconelli Gallucci',                   canal: 'Canal Próprio',  qtdOrc: 0,  totalOrc: 0,      fechados: 0, totalFech: 0, comissao: 3.5, cidade: 'São Paulo', estado: 'SP', email: 'pedro@friomac.ind.br', tel: '' },
    { id: 'r5',  nome: 'Ronaldo José Torrezan',                      canal: 'Representante',  qtdOrc: 0,  totalOrc: 0,      fechados: 0, totalFech: 0, comissao: 5.0, cidade: 'Campinas', estado: 'SP', email: '', tel: '' },
    { id: 'r6',  nome: 'Lauriberto Volpiano',                        canal: 'Representante',  qtdOrc: 3,  totalOrc: 168540,  fechados: 0, totalFech: 0, comissao: 5.0, cidade: 'Bauru', estado: 'SP', email: '', tel: '' },
    { id: 'r7',  nome: 'Pedro Gallucci',                             canal: 'Canal Próprio',  qtdOrc: 0,  totalOrc: 0,      fechados: 0, totalFech: 0, comissao: 3.5, cidade: 'São Paulo', estado: 'SP', email: '', tel: '' },
    { id: 'r8',  nome: 'GLPereira Representações Comerciais Ltda',   canal: 'Representante',  qtdOrc: 0,  totalOrc: 0,      fechados: 0, totalFech: 0, comissao: 5.0, cidade: 'Curitiba', estado: 'PR', email: '', tel: '' },
    { id: 'r9',  nome: 'Mazan Comércio e Repres. Comercial Equip',   canal: 'Representante',  qtdOrc: 0,  totalOrc: 0,      fechados: 0, totalFech: 0, comissao: 5.0, cidade: 'Belo Horizonte', estado: 'MG', email: '', tel: '' },
    { id: 'r10', nome: 'Friomac Indústria e Comércio (Canal Direto)', canal: 'Canal Próprio', qtdOrc: 0,  totalOrc: 0,      fechados: 0, totalFech: 0, comissao: 0,   cidade: 'Piracicaba', estado: 'SP', email: 'vendas@friomac.ind.br', tel: '(19) 3407-9500' },
    { id: 'r11', nome: 'Mario Camara Filho',                         canal: 'Representante',  qtdOrc: 0,  totalOrc: 0,      fechados: 0, totalFech: 0, comissao: 5.0, cidade: 'Porto Alegre', estado: 'RS', email: '', tel: '' },
    { id: 'r12', nome: 'A4 Equipamentos Ltda',                       canal: 'Representante',  qtdOrc: 0,  totalOrc: 0,      fechados: 0, totalFech: 0, comissao: 5.0, cidade: 'Goiânia', estado: 'GO', email: '', tel: '' },
    { id: 'r13', nome: 'Anderson — Tambaú',                          canal: 'Representante',  qtdOrc: 0,  totalOrc: 0,      fechados: 0, totalFech: 0, comissao: 5.0, cidade: 'Tambaú', estado: 'SP', email: '', tel: '' },
    { id: 'r14', nome: 'Rafael Correa',                              canal: 'Representante',  qtdOrc: 0,  totalOrc: 0,      fechados: 0, totalFech: 0, comissao: 5.0, cidade: 'Santos', estado: 'SP', email: '', tel: '' },
    { id: 'r15', nome: 'Gustavo Alcione de Freitas',                 canal: 'Canal Próprio',  qtdOrc: 0,  totalOrc: 0,      fechados: 0, totalFech: 0, comissao: 3.5, cidade: 'São Paulo', estado: 'SP', email: '', tel: '' },
  ];

  // ── LEADS — IMPORTADOS DA PLANILHA MESTRE ────────────
  const LEADS_BASE = [
    { id:'2967', dataAbertura:'2026-01-05', projeto:'P2432 R1 CAMARA FRIA',    cliente:'COXINHAS BABY - LOJA 3',             nomFantasia:'COXINHAS BABY',                  nomeCliente:'',              tel:'',              email:'',                              vendedor:'', valor:44000,   diasAberto:112, status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'novo_lead', obs:'[CONTATO RECEBIDO: PENDENTE]',  mes:'Jan', prioridade:'alta', tags:['câmara fria','varejo'] },
    { id:'2966', dataAbertura:'2026-01-05', projeto:'S/P',                     cliente:'JOSE CARLOS BOLPETO GELATERIA',      nomFantasia:'TARTUFI GELATERIA',              nomeCliente:'JOSE CARLOS',   tel:'11-97247.7711', email:'',                              vendedor:'', valor:5560,    diasAberto:112, status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'[CONTATO RECEBIDO: PENDENTE]',  mes:'Jan', prioridade:'baixa', tags:['gelateria'] },
    { id:'2968', dataAbertura:'2026-01-07', projeto:'S/P',                     cliente:'CAIO VICTOR VOLPIANO',               nomFantasia:'CAIO VICTOR VOLPIANO',           nomeCliente:'',              tel:'',              email:'',                              vendedor:'r1', valor:21250,   diasAberto:110, status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'[CONTATO RECEBIDO: PENDENTE]',  mes:'Jan', prioridade:'média', tags:[] },
    { id:'2971', dataAbertura:'2026-01-08', projeto:'S/P',                     cliente:'VALDECIR RODRIGUES LEAL',            nomFantasia:'',                               nomeCliente:'VALDECIR',      tel:'16-3343-5636',  email:'lgfecont@hotmail.com',          vendedor:'', valor:58600,   diasAberto:109, status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'[CONTATO RECEBIDO: PENDENTE]',  mes:'Jan', prioridade:'alta', tags:[] },
    { id:'2972', dataAbertura:'2026-01-09', projeto:'P2493',                   cliente:'CENTRATO COMERCIO DE PRODUTOS',      nomFantasia:'CENTRATO COMERCIO DE PRODUTOS',  nomeCliente:'',              tel:'',              email:'',                              vendedor:'r3', valor:53670,   diasAberto:108, status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'novo_lead', obs:'[CONTATO RECEBIDO: PENDENTE]',  mes:'Jan', prioridade:'alta', tags:[] },
    { id:'2976', dataAbertura:'2026-01-12', projeto:'S/P',                     cliente:'CENTRATO COMERCIO DE PRODUTOS',      nomFantasia:'CENTRATO COMERCIO DE PRODUTOS',  nomeCliente:'',              tel:'',              email:'',                              vendedor:'r3', valor:39270,   diasAberto:105, status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'novo_lead', obs:'[CONTATO RECEBIDO: PENDENTE]',  mes:'Jan', prioridade:'média', tags:[] },
    { id:'2974', dataAbertura:'2026-01-12', projeto:'A',                       cliente:'PAULA DIAS GALLI',                   nomFantasia:'NOVO AÇOUGUE',                   nomeCliente:'PAULA',         tel:'67-96657725',   email:'paulagalli.engcivil@gmail.com', vendedor:'', valor:28970,   diasAberto:105, status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'[CONTATO RECEBIDO: PENDENTE]',  mes:'Jan', prioridade:'média', tags:['açougue'] },
    { id:'2975', dataAbertura:'2026-01-12', projeto:'B-BR',                    cliente:'PAULA DIAS GALLI',                   nomFantasia:'NOVO AÇOUGUE',                   nomeCliente:'PAULA',         tel:'67-96657725',   email:'paulagalli.engcivil@gmail.com', vendedor:'', valor:38120,   diasAberto:105, status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'[CONTATO RECEBIDO: PENDENTE]',  mes:'Jan', prioridade:'média', tags:['açougue'] },
    { id:'2979', dataAbertura:'2026-01-15', projeto:'P2436',                   cliente:'CARREIRAS E PRADELA & CIA - BARCELOS', nomFantasia:'',                             nomeCliente:'',              tel:'',              email:'',                              vendedor:'', valor:342540,  diasAberto:102, status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'[CONTATO RECEBIDO: PENDENTE]',  mes:'Jan', prioridade:'alta', tags:['grande porte'] },
    { id:'2980', dataAbertura:'2026-01-15', projeto:'S/P',                     cliente:'CENTRATO COMERCIO DE PRODUTOS',      nomFantasia:'JOSE CARLOS',                    nomeCliente:'',              tel:'',              email:'',                              vendedor:'r3', valor:61690,   diasAberto:102, status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'novo_lead', obs:'[CONTATO RECEBIDO: PENDENTE]',  mes:'Jan', prioridade:'alta', tags:[] },
    { id:'2982', dataAbertura:'2026-01-16', projeto:'P2432 - R1 MOBILIA',      cliente:'CENTRATO COMERCIO DE PRODUTOS',      nomFantasia:'COXINHAS BABY',                  nomeCliente:'',              tel:'',              email:'',                              vendedor:'r3', valor:136370,  diasAberto:101, status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'novo_lead', obs:'[CONTATO RECEBIDO: PENDENTE]',  mes:'Jan', prioridade:'alta', tags:['mobilia'] },
    { id:'2984', dataAbertura:'2026-01-18', projeto:'P2432 - R1 ESPOSITORES',  cliente:'CENTRATO COMERCIO DE PRODUTOS',      nomFantasia:'COXINHAS BABY',                  nomeCliente:'',              tel:'',              email:'',                              vendedor:'r3', valor:36150,   diasAberto:99,  status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'novo_lead', obs:'[CONTATO RECEBIDO: PENDENTE]',  mes:'Jan', prioridade:'média', tags:['expositor'] },
    { id:'2985', dataAbertura:'2026-01-18', projeto:'P2432 - R1 BOOTS',        cliente:'CENTRATO COMERCIO DE PRODUTOS',      nomFantasia:'COXINHAS BABY',                  nomeCliente:'',              tel:'',              email:'',                              vendedor:'r3', valor:29000,   diasAberto:99,  status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'novo_lead', obs:'[CONTATO RECEBIDO: PENDENTE]',  mes:'Jan', prioridade:'baixa', tags:[] },
    { id:'2988', dataAbertura:'2026-01-21', projeto:'P2449',                   cliente:'CAIO VICTOR VOLPIANO',               nomFantasia:'EMPORIO NASA LTDA',              nomeCliente:'',              tel:'',              email:'',                              vendedor:'r1', valor:17890,   diasAberto:96,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'[CONTATO RECEBIDO: PENDENTE]',  mes:'Jan', prioridade:'baixa', tags:[] },
    { id:'2989', dataAbertura:'2026-01-21', projeto:'B-R2',                    cliente:'PAULA DIAS GALLI',                   nomFantasia:'NOVO AÇOUGUE',                   nomeCliente:'PAULA',         tel:'67-96657725',   email:'paulagalli.engcivil@gmail.com', vendedor:'', valor:45000,   diasAberto:96,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'[CONTATO RECEBIDO: PENDENTE]',  mes:'Jan', prioridade:'média', tags:['açougue'] },
    { id:'2991', dataAbertura:'2026-01-22', projeto:'S/P',                     cliente:'CAFETERIA BON CAFE',                 nomFantasia:'BON CAFÉ',                       nomeCliente:'MARCOS',        tel:'(11) 9-8765-4321', email:'marcos@boncafe.com.br',        vendedor:'r2', valor:18500,   diasAberto:95,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'orcamento_env', obs:'Orçamento enviado em 23/01. Aguardando retorno.',  mes:'Jan', prioridade:'média', tags:['cafeteria'] },
    { id:'2993', dataAbertura:'2026-01-24', projeto:'P2501',                   cliente:'SUPERMERCADO BOM PRECO',             nomFantasia:'SUPERMERCADO BOM PREÇO',         nomeCliente:'ROBERTO',       tel:'(16) 3322-1122', email:'roberto@bompreco.com.br',       vendedor:'r1', valor:185000,  diasAberto:93,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'follow_up', obs:'2ª visita realizada. Cliente pediu revisão de preço.',  mes:'Jan', prioridade:'alta', tags:['supermercado','grande porte'] },
    { id:'2995', dataAbertura:'2026-01-26', projeto:'S/P',                     cliente:'PADARIA TRIGO DE OURO',              nomFantasia:'PADARIA TRIGO DE OURO',          nomeCliente:'SÉRGIO',        tel:'(19) 3333-4455', email:'',                              vendedor:'r1', valor:32400,   diasAberto:91,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'',  mes:'Jan', prioridade:'média', tags:['padaria'] },
    { id:'2997', dataAbertura:'2026-01-28', projeto:'P2511',                   cliente:'FRIGORIFICO SANTA HELENA',           nomFantasia:'FRIGORÍFICO SANTA HELENA',       nomeCliente:'WAGNER',        tel:'(14) 99999-8877', email:'wagner@santahelena.ind.br',     vendedor:'r6', valor:428000,  diasAberto:89,  status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'pre_projeto', obs:'Pré-projeto 3D aprovado. Aguarda visita fechamento.',  mes:'Jan', prioridade:'alta', tags:['frigorifico','câmara fria','grande porte'] },
    { id:'2999', dataAbertura:'2026-01-30', projeto:'S/P',                     cliente:'MERCADO ECONOMIA',                   nomFantasia:'MERCADO ECONOMIA',               nomeCliente:'CLÁUDIO',       tel:'(11) 2222-3344', email:'',                              vendedor:'r2', valor:67200,   diasAberto:87,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'orcamento_env', obs:'Orçamento enviado. Cliente comparando com concorrente.',  mes:'Jan', prioridade:'média', tags:['supermercado'] },
    { id:'3001', dataAbertura:'2026-02-02', projeto:'P2520',                   cliente:'SORVETERIA GELATO DI ROMA',          nomFantasia:'GELATO DI ROMA',                 nomeCliente:'LUIGI',         tel:'(11) 9-7654-3210', email:'luigi@gelato.com.br',           vendedor:'r1', valor:42000,   diasAberto:84,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'visita_loco', obs:'Visita agendada para 05/02.',  mes:'Fev', prioridade:'média', tags:['sorveteria'] },
    { id:'3003', dataAbertura:'2026-02-04', projeto:'P2525',                   cliente:'ATACADAO CENTRAL',                   nomFantasia:'ATACADÃO CENTRAL',               nomeCliente:'SANDRO',        tel:'(62) 3399-8877', email:'sandro@atacadaocentral.com.br', vendedor:'r12', valor:312000, diasAberto:82,  status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'follow_up', obs:'Follow up realizado em 08/02. Proposta ajustada.',  mes:'Fev', prioridade:'alta', tags:['atacado','grande porte'] },
    { id:'3005', dataAbertura:'2026-02-05', projeto:'S/P',                     cliente:'RESTAURANTE SABOR DA TERRA',         nomFantasia:'SABOR DA TERRA',                 nomeCliente:'GUSTAVO',       tel:'(11) 9-5544-3322', email:'',                             vendedor:'r2', valor:28900,   diasAberto:81,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'',  mes:'Fev', prioridade:'baixa', tags:['restaurante'] },
    { id:'3007', dataAbertura:'2026-02-07', projeto:'P2533',                   cliente:'HOSPITAL SAO LUCAS',                 nomFantasia:'HOSPITAL SÃO LUCAS',             nomeCliente:'VALERIA',       tel:'(19) 3600-0001', email:'valeria@saolucas.com.br',       vendedor:'r1', valor:195000,  diasAberto:79,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'visita_fech', obs:'Visita de fechamento amanhã. Documentação pronta.',  mes:'Fev', prioridade:'alta', tags:['saude','câmara fria','grande porte'] },
    { id:'3009', dataAbertura:'2026-02-09', projeto:'S/P',                     cliente:'ACOUGUE BELO CORTE',                 nomFantasia:'BELO CORTE',                     nomeCliente:'JOAO',          tel:'(11) 9-3322-1100', email:'',                             vendedor:'r4', valor:47500,   diasAberto:77,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'orcamento_env', obs:'Orçamento enviado por email e WhatsApp.',  mes:'Fev', prioridade:'média', tags:['açougue'] },
    { id:'3011', dataAbertura:'2026-02-11', projeto:'P2541',                   cliente:'LATICINIO SAO JOSE',                 nomFantasia:'LATICÍNIO SÃO JOSÉ',             nomeCliente:'DURVAL',        tel:'(14) 9-8899-7766', email:'durval@sjose.com.br',           vendedor:'r6', valor:256000,  diasAberto:75,  status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'pre_projeto', obs:'Projeto 2D aprovado. Aguarda reunião de ajuste.',  mes:'Fev', prioridade:'alta', tags:['laticinio','câmara fria'] },
    { id:'3013', dataAbertura:'2026-02-13', projeto:'S/P',                     cliente:'FARMACIA SAUDE TOTAL',               nomFantasia:'SAÚDE TOTAL',                    nomeCliente:'BEATRIZ',       tel:'(11) 9-2211-0099', email:'beatriz@saudetotal.com.br',     vendedor:'r2', valor:38000,   diasAberto:73,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'Lead via site. Primeiro contato feito.',  mes:'Fev', prioridade:'baixa', tags:['farmacia'] },
    { id:'3015', dataAbertura:'2026-02-15', projeto:'P2549',                   cliente:'CHURRASCARIA GAUCHAO',               nomFantasia:'GAUCHÃO',                        nomeCliente:'ROBERTO',       tel:'(51) 9-7766-5544', email:'',                              vendedor:'r11', valor:89000,  diasAberto:71,  status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'follow_up', obs:'Reunião de follow up marcada para 20/02.',  mes:'Fev', prioridade:'média', tags:['restaurante','churrascaria'] },
    { id:'3017', dataAbertura:'2026-02-17', projeto:'S/P',                     cliente:'MERCEARIA BOA VISTA',                nomFantasia:'BOA VISTA',                      nomeCliente:'CARLOS',        tel:'(11) 9-1100-9988', email:'',                              vendedor:'r1', valor:15800,   diasAberto:69,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'',  mes:'Fev', prioridade:'baixa', tags:['mercado'] },
    { id:'3019', dataAbertura:'2026-02-19', projeto:'P2557',                   cliente:'INDUSTRIA ALIMENTOS NATURA',         nomFantasia:'NATURA ALIMENTOS',               nomeCliente:'MARCIO',        tel:'(11) 4444-5566', email:'marcio@natura-alimentos.com.br', vendedor:'r1', valor:524000,  diasAberto:67,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'contrato_env', obs:'Contrato enviado para assinatura. Aguarda jurídico.',  mes:'Fev', prioridade:'alta', tags:['industria','câmara fria','grande porte'] },
    { id:'3021', dataAbertura:'2026-02-21', projeto:'S/P',                     cliente:'PADARIA SABOR & ARTE',               nomFantasia:'SABOR & ARTE',                   nomeCliente:'SILVIA',        tel:'(19) 9-3344-5566', email:'silvia@saborearte.com.br',     vendedor:'r3', valor:24500,   diasAberto:65,  status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'orcamento_env', obs:'Orçamento detalhado enviado em 24/02.',  mes:'Fev', prioridade:'baixa', tags:['padaria'] },
    { id:'3023', dataAbertura:'2026-02-23', projeto:'P2563',                   cliente:'SUPERMERCADO FAMILIA UNIDA',         nomFantasia:'FAMÍLIA UNIDA',                  nomeCliente:'ALTAIR',        tel:'(18) 9-7788-9900', email:'altair@familiaunida.com.br',    vendedor:'r6', valor:178000,  diasAberto:63,  status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'visita_loco', obs:'Visita realizada em 26/02. Montando proposta.',  mes:'Fev', prioridade:'alta', tags:['supermercado'] },
    { id:'3025', dataAbertura:'2026-02-25', projeto:'S/P',                     cliente:'ACOUGUE CORTE NOBRE',                nomFantasia:'CORTE NOBRE',                    nomeCliente:'ARNALDO',       tel:'(11) 9-6677-8899', email:'',                              vendedor:'r2', valor:52000,   diasAberto:61,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'follow_up', obs:'',  mes:'Fev', prioridade:'média', tags:['açougue'] },
    { id:'3027', dataAbertura:'2026-02-27', projeto:'P2571',                   cliente:'REDE DE FARMACIAS SAUDE +',          nomFantasia:'SAÚDE +',                        nomeCliente:'DANIELA',       tel:'(11) 3322-1100', email:'daniela@saudemais.com.br',       vendedor:'r1', valor:340000,  diasAberto:59,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'pre_projeto', obs:'Projeto 3D aprovado pela engenharia do cliente.',  mes:'Fev', prioridade:'alta', tags:['farmacia','grande porte'] },
    { id:'3029', dataAbertura:'2026-03-01', projeto:'S/P',                     cliente:'BAR E LANCHONETE AVENIDA',           nomFantasia:'LANCHONETE AVENIDA',             nomeCliente:'JAIR',          tel:'(11) 9-5566-7788', email:'',                              vendedor:'r4', valor:12000,   diasAberto:57,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'',  mes:'Mar', prioridade:'baixa', tags:[] },
    { id:'3031', dataAbertura:'2026-03-03', projeto:'P2580',                   cliente:'HIPERMERCADO BRASIL CENTER',         nomFantasia:'BRASIL CENTER',                  nomeCliente:'FLAVIO',        tel:'(62) 3300-0099', email:'flavio@brasilcenter.com.br',     vendedor:'r12', valor:690000, diasAberto:55,  status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'visita_fech', obs:'Negociação final em andamento.',  mes:'Mar', prioridade:'alta', tags:['hipermercado','grande porte'] },
    { id:'3033', dataAbertura:'2026-03-05', projeto:'S/P',                     cliente:'CONFEITARIA BELLA DOLCE',            nomFantasia:'BELLA DOLCE',                    nomeCliente:'ANA PAULA',     tel:'(11) 9-7766-3344', email:'paula@belladolce.com.br',       vendedor:'r2', valor:21000,   diasAberto:53,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'orcamento_env', obs:'Cliente solicitou revisão de layout.',  mes:'Mar', prioridade:'baixa', tags:['confeitaria'] },
    { id:'3035', dataAbertura:'2026-03-07', projeto:'P2589',                   cliente:'POSTO DE COMBUSTIVEL EXPRESSO',      nomFantasia:'EXPRESSO COMBUSTÍVEIS',          nomeCliente:'MOACIR',        tel:'(19) 9-4455-6677', email:'moacir@expresso.com.br',       vendedor:'r1', valor:48000,   diasAberto:51,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'Lead via Instagram.',  mes:'Mar', prioridade:'média', tags:['conveniencia'] },
    { id:'3037', dataAbertura:'2026-03-09', projeto:'P2593',                   cliente:'ESCOLA DE GASTRONOMIA GOURMET',      nomFantasia:'ESCOLA GOURMET',                 nomeCliente:'PATRICIA',      tel:'(11) 9-3344-7788', email:'patricia@escolagourmet.com.br', vendedor:'r3', valor:76500,   diasAberto:49,  status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'follow_up', obs:'Follow up realizado. Aguarda reunião com diretoria.',  mes:'Mar', prioridade:'média', tags:['escola','gastronomia'] },
    { id:'3039', dataAbertura:'2026-03-11', projeto:'S/P',                     cliente:'BUFFET EVENTS PLUS',                 nomFantasia:'EVENTS PLUS',                    nomeCliente:'ELIANE',        tel:'(11) 9-2211-5566', email:'eliane@eventsplus.com.br',      vendedor:'r2', valor:35000,   diasAberto:47,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'visita_loco', obs:'Visita agendada.',  mes:'Mar', prioridade:'média', tags:['buffet'] },
    { id:'3041', dataAbertura:'2026-03-13', projeto:'P2600',                   cliente:'DISTRIBUIDORA FRIOS MASTER',         nomFantasia:'FRIOS MASTER',                   nomeCliente:'HELIO',         tel:'(11) 3377-8899', email:'helio@friosmaster.com.br',       vendedor:'r1', valor:156000,  diasAberto:45,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'contrato_env', obs:'Contrato enviado. Dependendo de aprovação do crédito.',  mes:'Mar', prioridade:'alta', tags:['distribuidora','câmara fria'] },
    { id:'3043', dataAbertura:'2026-03-15', projeto:'S/P',                     cliente:'CLINICA VETERINARIA PATAMANIA',      nomFantasia:'PATAMANIA',                      nomeCliente:'RENATA',        tel:'(11) 9-9988-7766', email:'renata@patamania.com.br',       vendedor:'r2', valor:19000,   diasAberto:43,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'orcamento_env', obs:'',  mes:'Mar', prioridade:'baixa', tags:['veterinaria'] },
    { id:'3045', dataAbertura:'2026-03-17', projeto:'P2608',                   cliente:'COOPERATIVA LATICINIO TAUBATÉ',      nomFantasia:'COOPERATIVA TAUBATÉ',            nomeCliente:'VALDEMAR',      tel:'(12) 3200-1122', email:'valdemar@coop-taub.com.br',     vendedor:'r6', valor:387000,  diasAberto:41,  status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'pre_projeto', obs:'Visita técnica realizada. Projeto em elaboração.',  mes:'Mar', prioridade:'alta', tags:['cooperativa','laticinio','grande porte'] },
    { id:'3047', dataAbertura:'2026-03-19', projeto:'S/P',                     cliente:'PETSHOP AMIGO FIEL',                 nomFantasia:'AMIGO FIEL',                     nomeCliente:'CRISTIANE',     tel:'(11) 9-8877-6655', email:'',                              vendedor:'r4', valor:16500,   diasAberto:39,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'',  mes:'Mar', prioridade:'baixa', tags:[] },
    { id:'3049', dataAbertura:'2026-03-21', projeto:'P2615',                   cliente:'MERCADO MAIS BARATO LTDA',           nomFantasia:'MERCADO MAIS BARATO',            nomeCliente:'OSVALDO',       tel:'(11) 4455-6677', email:'osvaldo@maisbarato.com.br',      vendedor:'r1', valor:93000,   diasAberto:37,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'follow_up', obs:'',  mes:'Mar', prioridade:'média', tags:['supermercado'] },
    { id:'3051', dataAbertura:'2026-03-23', projeto:'S/P',                     cliente:'HOTEL FAZENDA TERRA VERDE',          nomFantasia:'TERRA VERDE',                    nomeCliente:'FRANCISCO',     tel:'(19) 3500-7788', email:'francisco@terraverde.com.br',    vendedor:'r3', valor:128000,  diasAberto:35,  status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'orcamento_env', obs:'Orçamento completo enviado incluindo instalação.',  mes:'Mar', prioridade:'alta', tags:['hotel','grande porte'] },
    { id:'3053', dataAbertura:'2026-03-25', projeto:'P2622',                   cliente:'ACADEMIA CORPO & SAUDE',             nomFantasia:'CORPO & SAÚDE',                  nomeCliente:'MÔNICA',        tel:'(11) 9-6655-4433', email:'monica@corposaude.com.br',      vendedor:'r2', valor:34000,   diasAberto:33,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'',  mes:'Mar', prioridade:'baixa', tags:[] },
    { id:'3055', dataAbertura:'2026-03-27', projeto:'P2628',                   cliente:'SUPERMERCADO RIO VERDE',             nomFantasia:'RIO VERDE',                      nomeCliente:'HENRIQUE',      tel:'(64) 3300-2233', email:'henrique@rioverde.com.br',       vendedor:'r12', valor:215000, diasAberto:31,  status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'visita_loco', obs:'',  mes:'Mar', prioridade:'alta', tags:['supermercado'] },
    { id:'3057', dataAbertura:'2026-03-29', projeto:'S/P',                     cliente:'DOCERIA AMOR DOCE',                  nomFantasia:'AMOR DOCE',                      nomeCliente:'FERNANDA',      tel:'(11) 9-4433-2211', email:'',                              vendedor:'r1', valor:11500,   diasAberto:29,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'',  mes:'Mar', prioridade:'baixa', tags:['doceria'] },
    { id:'3059', dataAbertura:'2026-04-01', projeto:'P2635',                   cliente:'FRIGORIFICO ARAXA',                  nomFantasia:'FRIGORÍFICO ARAXÁ',              nomeCliente:'BENEDITO',      tel:'(34) 9-8899-7766', email:'benedito@araxa-frig.com.br',    vendedor:'r9', valor:456000,  diasAberto:26,  status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'follow_up', obs:'Proposta revisada enviada.',  mes:'Abr', prioridade:'alta', tags:['frigorifico','câmara fria','grande porte'] },
    { id:'3061', dataAbertura:'2026-04-03', projeto:'S/P',                     cliente:'ACAI TROPICAL',                      nomFantasia:'AÇAÍ TROPICAL',                  nomeCliente:'TIAGO',         tel:'(11) 9-7766-8899', email:'tiago@acaitropical.com.br',     vendedor:'r2', valor:9800,    diasAberto:24,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'orcamento_env', obs:'',  mes:'Abr', prioridade:'baixa', tags:['acai'] },
    { id:'3063', dataAbertura:'2026-04-05', projeto:'P2641',                   cliente:'INDUSTRIA CARNEA PRIMOR',            nomFantasia:'CARNEA PRIMOR',                  nomeCliente:'LEANDRO',       tel:'(41) 3300-5566', email:'leandro@carneaprimor.com.br',    vendedor:'r8', valor:632000,  diasAberto:22,  status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'pre_projeto', obs:'Visita técnica confirmada para 10/04.',  mes:'Abr', prioridade:'alta', tags:['industria','câmara fria','grande porte'] },
    { id:'3065', dataAbertura:'2026-04-07', projeto:'S/P',                     cliente:'BISTRÔ PARIS',                       nomFantasia:'BISTRÔ PARIS',                   nomeCliente:'ISABELLE',      tel:'(11) 9-3344-5566', email:'isabelle@bistroparis.com.br',   vendedor:'r1', valor:27000,   diasAberto:20,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'Lead via Facebook Ads.',  mes:'Abr', prioridade:'baixa', tags:['restaurante'] },
    { id:'3067', dataAbertura:'2026-04-09', projeto:'P2648',                   cliente:'REDE SUPERMERCADO SERTÃO',           nomFantasia:'SERTÃO SUPERMERCADOS',           nomeCliente:'GENIVALDO',     tel:'(75) 3300-1122', email:'genivaldo@sertao.com.br',        vendedor:'r14', valor:284000, diasAberto:18,  status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'visita_loco', obs:'',  mes:'Abr', prioridade:'alta', tags:['supermercado','grande porte'] },
    { id:'3069', dataAbertura:'2026-04-11', projeto:'S/P',                     cliente:'BUFFET SABORES DO BRASIL',           nomFantasia:'SABORES DO BRASIL',              nomeCliente:'ADRIANA',       tel:'(11) 9-2211-3344', email:'adriana@saboresnobrasil.com.br', vendedor:'r2', valor:43000,  diasAberto:16,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'orcamento_env', obs:'',  mes:'Abr', prioridade:'média', tags:['buffet'] },
    { id:'3071', dataAbertura:'2026-04-13', projeto:'P2655',                   cliente:'MATADOURO MUNICIPAL REGENTE FEIJO',  nomFantasia:'MATADOURO REGENTE',              nomeCliente:'NILTON',        tel:'(19) 9-8877-5544', email:'nilton@matadouro.gov.br',       vendedor:'r1', valor:198000,  diasAberto:14,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'Licitação municipal. Necessita documentação técnica.',  mes:'Abr', prioridade:'alta', tags:['governo','câmara fria'] },
    { id:'3073', dataAbertura:'2026-04-15', projeto:'S/P',                     cliente:'RESTAURANTE DO PORTO',               nomFantasia:'RESTAURANTE DO PORTO',           nomeCliente:'JULIO',         tel:'(13) 9-3322-5544', email:'',                              vendedor:'r4', valor:58000,   diasAberto:12,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'',  mes:'Abr', prioridade:'média', tags:['restaurante','frutos do mar'] },
    { id:'3075', dataAbertura:'2026-04-17', projeto:'P2662',                   cliente:'MULTINACIONAL FOODS BRAZIL',         nomFantasia:'FOODS BRAZIL',                   nomeCliente:'RENATO',        tel:'(11) 5544-3322', email:'renato@foodsbrazil.com.br',      vendedor:'r1', valor:980000,  diasAberto:10,  status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'orcamento_env', obs:'Orçamento corporativo em elaboração.',  mes:'Abr', prioridade:'alta', tags:['industria','grande porte','multinacional'] },
    { id:'3077', dataAbertura:'2026-04-19', projeto:'S/P',                     cliente:'EMPÓRIO GOURMET DA VILLA',           nomFantasia:'DA VILLA EMPÓRIO',               nomeCliente:'CELSO',         tel:'(11) 9-6655-7788', email:'celso@davilla.com.br',          vendedor:'r2', valor:31000,   diasAberto:8,   status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'Lead via Google Ads.',  mes:'Abr', prioridade:'baixa', tags:['empório'] },
    { id:'3079', dataAbertura:'2026-04-21', projeto:'P2669',                   cliente:'COOPERATIVA AGRICOLA VALE DO RIBEIRA', nomFantasia:'COOP VALE RIBEIRA',           nomeCliente:'DIRCEU',        tel:'(13) 3300-8877', email:'dirceu@coopvaleribeira.com.br',  vendedor:'r6', valor:345000,  diasAberto:6,   status:'EM ABERTO', canal:'REPRESENTANTE',  etapa:'visita_loco', obs:'Primeira visita realizada em 22/04.',  mes:'Abr', prioridade:'alta', tags:['cooperativa','câmara fria','grande porte'] },
    { id:'3081', dataAbertura:'2026-04-23', projeto:'S/P',                     cliente:'CONVENIÊNCIA NIGHT & DAY',           nomFantasia:'NIGHT & DAY',                    nomeCliente:'FABIO',         tel:'(11) 9-4455-6677', email:'fabio@nightday.com.br',         vendedor:'r4', valor:22000,   diasAberto:4,   status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'',  mes:'Abr', prioridade:'baixa', tags:['conveniencia'] },
    { id:'3083', dataAbertura:'2026-04-25', projeto:'P2676',                   cliente:'CLINICA ODONTOLOGICA SORRISOS',      nomFantasia:'SORRISOS CLINICA',               nomeCliente:'VERA',          tel:'(11) 9-8877-0011', email:'vera@sorrisos.com.br',          vendedor:'r2', valor:27500,   diasAberto:2,   status:'EM ABERTO', canal:'CANAL PRÓPRIO',  etapa:'novo_lead', obs:'Lead via indicação.',  mes:'Abr', prioridade:'baixa', tags:['saude'] },
  ];

  // ── KPIs E METAS ─────────────────────────────────────
  const KPIS = {
    metaAnual:         12000000,
    totalOrcado:       4139837,
    totalFechado:      0,
    qtdOrcamentos:     65,
    qtdFechados:       0,
    taxaConversao:     0,
    ticketMedio:       0,
    vendedoresAtivos:  15,
    onTimeDelivery:    98,
    metas: {
      taxaConversao:   35,
      ticketMedio:     130000,
      orcMes:          80,
      fechMes:         20,
      receitaVendMes:  350000,
    },
    mensal: [
      { mes: 'Jan', qtdOrc: 43, totalOrc: 2397335, qtdFech: 0, totalFech: 0 },
      { mes: 'Fev', qtdOrc: 14, totalOrc: 1353582, qtdFech: 0, totalFech: 0 },
      { mes: 'Mar', qtdOrc: 0,  totalOrc: 0,       qtdFech: 0, totalFech: 0 },
      { mes: 'Abr', qtdOrc: 12, totalOrc: 388920,  qtdFech: 0, totalFech: 0 },
      { mes: 'Mai', qtdOrc: 0,  totalOrc: 0,       qtdFech: 0, totalFech: 0 },
      { mes: 'Jun', qtdOrc: 0,  totalOrc: 0,       qtdFech: 0, totalFech: 0 },
      { mes: 'Jul', qtdOrc: 0,  totalOrc: 0,       qtdFech: 0, totalFech: 0 },
      { mes: 'Ago', qtdOrc: 0,  totalOrc: 0,       qtdFech: 0, totalFech: 0 },
      { mes: 'Set', qtdOrc: 0,  totalOrc: 0,       qtdFech: 0, totalFech: 0 },
      { mes: 'Out', qtdOrc: 0,  totalOrc: 0,       qtdFech: 0, totalFech: 0 },
      { mes: 'Nov', qtdOrc: 0,  totalOrc: 0,       qtdFech: 0, totalFech: 0 },
      { mes: 'Dez', qtdOrc: 0,  totalOrc: 0,       qtdFech: 0, totalFech: 0 },
    ]
  };

  // ── STATE / STORE ────────────────────────────────────
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

  function _seedUsers() {
    return USERS_SEED.map(u => ({...u, menuPermissoes:[...u.menuPermissoes], tipoAcesso:{...u.tipoAcesso}}));
  }

  function _seedMensagens() {
    return [
      { id:'msg_seed1', tipo:'sistema', titulo:'Bem-vindo ao Friomac CRM', conteudo:'Sistema inicializado com sucesso. Configure os usuários em Configurações > Usuários.', de:'sistema', para:'todos', dataEnvio:new Date().toISOString(), lidos:[], respostas:[] },
      { id:'msg_seed2', tipo:'alerta',  titulo:'Pipeline: leads sem atividade', conteudo:'Existem leads com mais de 90 dias sem movimentação. Acesse o Kanban e revise as oportunidades em aberto.', de:'sistema', para:'todos', dataEnvio:new Date().toISOString(), lidos:[], respostas:[] },
    ];
  }

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
    _saveToStorage();
  }

  function _isRestricted() {
    const u = _state.currentUser;
    return u && u.role !== 'master' && u.role !== 'adm_geral' && !!u.repId;
  }

  function _loadFromStorage() {
    try {
      const saved = localStorage.getItem('friomac_crm_data');
      if (saved) {
        const data = JSON.parse(saved);
        // Migrate users: se não tem campo 'login' é formato antigo, ressemeiar
        const stored = data.users;
        if (stored && stored.length > 0 && stored.some(u => u.login)) {
          _state.users = stored;
        } else {
          _state.users = _seedUsers();
        }
        _state.resetRequests  = data.resetRequests  || [];
        _state.auditLog       = data.auditLog       || [];
        _state.mensagens      = data.mensagens      || _seedMensagens();
        _state.leads          = data.leads          || [...LEADS_BASE.map(l => ({...l}))];
        _state.reps           = data.reps           || [...REPS_BASE.map(r => ({...r}))];
        _state.clientes       = data.clientes       || _buildClientesFromLeads();
        _state.comissoes      = data.comissoes      || [];
        _state.entregas       = data.entregas       || [];
        _state.orcamentos     = data.orcamentos     || [];
        _state.campanhas      = data.campanhas      || [];
        _state.solicitacoesMkt= data.solicitacoesMkt|| [];
        _state.repositorioMkt = data.repositorioMkt || [];
        _state.comunicados    = data.comunicados    || [];
      } else {
        _state.users         = _seedUsers();
        _state.resetRequests = [];
        _state.auditLog      = [];
        _state.mensagens     = _seedMensagens();
        _state.leads         = [...LEADS_BASE.map(l => ({...l}))];
        _state.reps          = [...REPS_BASE.map(r => ({...r}))];
        _state.clientes      = _buildClientesFromLeads();
        _state.comissoes     = [];
        _state.entregas      = [];
        _state.orcamentos    = [];
      }
    } catch(e) {
      _state.users           = _seedUsers();
      _state.resetRequests   = [];
      _state.auditLog        = [];
      _state.mensagens       = _seedMensagens();
      _state.leads           = [...LEADS_BASE.map(l => ({...l}))];
      _state.reps            = [...REPS_BASE.map(r => ({...r}))];
      _state.clientes        = _buildClientesFromLeads();
      _state.comissoes       = [];
      _state.entregas        = [];
      _state.orcamentos      = [];
      _state.campanhas       = [];
      _state.solicitacoesMkt = [];
      _state.repositorioMkt  = [];
      _state.comunicados     = [];
    }
  }

  function _saveToStorage() {
    try {
      localStorage.setItem('friomac_crm_data', JSON.stringify({
        users:           _state.users,
        resetRequests:   _state.resetRequests,
        auditLog:        _state.auditLog,
        mensagens:       _state.mensagens,
        leads:           _state.leads,
        reps:            _state.reps,
        clientes:        _state.clientes,
        comissoes:       _state.comissoes,
        entregas:        _state.entregas,
        orcamentos:      _state.orcamentos,
        campanhas:       _state.campanhas,
        solicitacoesMkt: _state.solicitacoesMkt,
        repositorioMkt:  _state.repositorioMkt,
        comunicados:     _state.comunicados,
      }));
    } catch(e) {}
  }

  function _buildClientesFromLeads() {
    const map = {};
    LEADS_BASE.forEach(l => {
      const key = (l.nomFantasia || l.cliente || '').trim().toUpperCase();
      if (key && !map[key]) {
        map[key] = {
          id: 'c' + Object.keys(map).length,
          nomeFantasia: l.nomFantasia || l.cliente,
          nomeCliente:  l.nomeCliente || '',
          telefone:     l.tel   || '',
          email:        l.email || '',
          canal:        l.canal || '',
          cidade:       '',
          estado:       '',
          segmento:     l.tags && l.tags[0] ? l.tags[0] : '',
          qtdOrcamentos: 1,
          totalOrcado:   l.valor || 0,
          dataCadastro:  l.dataAbertura,
          ativo:         true,
          obs:           '',
        };
      } else if (key && map[key]) {
        map[key].qtdOrcamentos++;
        map[key].totalOrcado += (l.valor || 0);
      }
    });
    return Object.values(map);
  }

  // ── PUBLIC API ───────────────────────────────────────
  return {
    init() { _loadFromStorage(); },

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
        _logAction('LOGIN', u.login, `Acesso via ${id.includes('@')?'email':'login'}`);
        return u;
      }
      return null;
    },
    logout() {
      if (_state.currentUser) _logAction('LOGOUT', _state.currentUser.login, '');
      _state.currentUser = null;
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
      _saveToStorage();
      return u;
    },

    updateSystemUser(id, updates) {
      const idx = _state.users.findIndex(u => u.id === id);
      if (idx >= 0) {
        _state.users[idx] = { ..._state.users[idx], ...updates };
        _saveToStorage();
        return _state.users[idx];
      }
      return null;
    },

    deleteSystemUser(id) {
      const u = _state.users.find(x => x.id === id);
      _logAction('USER_EXCLUIDO', u?.login||id, `Nome: ${u?.nome||'?'}`);
      _state.users = _state.users.filter(u => u.id !== id);
      _saveToStorage();
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
      _saveToStorage();
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
        _saveToStorage();
      }
    },

    rejectResetRequest(reqId, aprovadoPorId) {
      const idx = _state.resetRequests.findIndex(r => r.id === reqId);
      if (idx >= 0) {
        _state.resetRequests[idx] = { ..._state.resetRequests[idx], status:'rejeitado', aprovadoPor:aprovadoPorId, dataResolucao: new Date().toISOString().split('T')[0] };
        _saveToStorage();
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
      _saveToStorage();
      return m;
    },

    marcarMensagemLida(msgId, userId) {
      const m = _state.mensagens.find(x => x.id === msgId);
      if (m && !(m.lidos||[]).includes(userId)) {
        m.lidos = [...(m.lidos||[]), userId];
        _saveToStorage();
      }
    },

    responderMensagem(msgId, userId, userName, texto) {
      const m = _state.mensagens.find(x => x.id === msgId);
      if (m) {
        m.respostas = [...(m.respostas||[]), { userId, userName, texto, timestamp: new Date().toISOString() }];
        _logAction('MSG_RESPOSTA', msgId, `De: ${userName}`);
        _saveToStorage();
      }
    },

    deleteMensagem(msgId) {
      _logAction('MSG_EXCLUIDA', msgId, '');
      _state.mensagens = _state.mensagens.filter(m => m.id !== msgId);
      _saveToStorage();
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

      // Escopo restrito: vendedor/representante vê apenas seus leads
      if (_isRestricted()) {
        const repId = _state.currentUser.repId;
        list = list.filter(l => l.vendedor === repId);
      }

      // By default show only active (not ganho/perdido) unless explicitly requested
      if (filters.resultado === 'ganho') {
        list = list.filter(l => l.resultado === 'ganho');
      } else if (filters.resultado === 'perdido') {
        list = list.filter(l => l.resultado === 'perdido');
      } else if (!filters.incluirInativos) {
        list = list.filter(l => !l.resultado); // only active (no outcome yet)
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
        _saveToStorage();
        return _state.leads[idx];
      }
      return null;
    },

    addLead(lead) {
      const newId = String(Math.max(..._state.leads.map(l => parseInt(l.id)||0)) + 1);
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
      _saveToStorage();
      return newLead;
    },

    deleteLead(id) {
      // Never truly delete — mark as excluido but keep in base
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

    // ── ANEXOS ──────────────────────────────────────
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
      };
      // Store base64 separately to avoid giant JSON in main store
      if (fileInfo.base64) {
        try { localStorage.setItem(`friomac_file_${leadId}_${anexo.id}`, fileInfo.base64); } catch(e) {}
      }
      const anexos = [...(lead.anexos || []), anexo];
      this.updateLead(leadId, { anexos });
      return anexo;
    },

    getAnexoData(leadId, anexoId) {
      try { return localStorage.getItem(`friomac_file_${leadId}_${anexoId}`); } catch(e) { return null; }
    },

    removeAnexo(leadId, anexoId) {
      const lead = this.getLeadById(leadId);
      if (!lead) return;
      try { localStorage.removeItem(`friomac_file_${leadId}_${anexoId}`); } catch(e) {}
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

      // Auto-create delivery record
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

      // Auto-create commission record
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
        _saveToStorage();
        return _state.reps[idx];
      }
      return null;
    },

    addRep(rep) {
      const newRep = { id: 'r' + Date.now(), qtdOrc: 0, totalOrc: 0, fechados: 0, totalFech: 0, ativo: true, anexos: [], ...rep };
      _state.reps.push(newRep);
      _saveToStorage();
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
      };
      if (fileInfo.base64) {
        try { localStorage.setItem(`friomac_rep_file_${repId}_${anexo.id}`, fileInfo.base64); } catch(e) {}
      }
      const anexos = [...(rep.anexos || []), anexo];
      this.updateRep(repId, { anexos });
      return anexo;
    },
    getRepAnexoData(repId, anexoId) {
      try { return localStorage.getItem(`friomac_rep_file_${repId}_${anexoId}`); } catch(e) { return null; }
    },
    removeRepAnexo(repId, anexoId) {
      const rep = this.getRepById(repId);
      if (!rep) return;
      try { localStorage.removeItem(`friomac_rep_file_${repId}_${anexoId}`); } catch(e) {}
      this.updateRep(repId, { anexos: (rep.anexos||[]).filter(a => a.id !== anexoId) });
    },

    // ── CAMPANHAS ──────────────────────────────────
    getCampanhas()    { return [..._state.campanhas]; },
    addCampanha(c) {
      const nc = { id: 'camp_'+Date.now(), dataCriacao: new Date().toISOString().split('T')[0], status:'ativa', ...c };
      _state.campanhas.push(nc); _saveToStorage(); return nc;
    },
    updateCampanha(id, upd) {
      const i = _state.campanhas.findIndex(c=>c.id===id);
      if(i>=0){ _state.campanhas[i]={..._state.campanhas[i],...upd}; _saveToStorage(); return _state.campanhas[i]; }
    },
    deleteCampanha(id) {
      _state.campanhas = _state.campanhas.filter(c=>c.id!==id); _saveToStorage();
    },

    // ── SOLICITAÇÕES MKT ───────────────────────────
    getSolicitacoesMkt()  { return [..._state.solicitacoesMkt]; },
    addSolicitacaoMkt(s) {
      const ns = { id: 'smkt_'+Date.now(), dataSolicita: new Date().toISOString().split('T')[0], status:'pendente', ...s };
      _state.solicitacoesMkt.push(ns); _saveToStorage(); return ns;
    },
    updateSolicitacaoMkt(id, upd) {
      const i = _state.solicitacoesMkt.findIndex(s=>s.id===id);
      if(i>=0){ _state.solicitacoesMkt[i]={..._state.solicitacoesMkt[i],...upd}; _saveToStorage(); }
    },

    // ── REPOSITÓRIO MKT ────────────────────────────
    getRepositorioMkt()   { return [..._state.repositorioMkt]; },
    addItemRepo(item) {
      const ni = { id: 'repo_'+Date.now(), dataUpload: new Date().toISOString().split('T')[0], ...item };
      _state.repositorioMkt.push(ni); _saveToStorage(); return ni;
    },
    removeItemRepo(id) {
      try { const item = _state.repositorioMkt.find(i=>i.id===id); if(item) localStorage.removeItem(`friomac_repo_file_${id}`); } catch(e){}
      _state.repositorioMkt = _state.repositorioMkt.filter(i=>i.id!==id); _saveToStorage();
    },
    getRepoItemData(id) {
      try { return localStorage.getItem(`friomac_repo_file_${id}`); } catch(e) { return null; }
    },

    // ── COMUNICADOS ────────────────────────────────
    getComunicados()   { return [..._state.comunicados]; },
    addComunicado(c) {
      const nc = { id: 'com_'+Date.now(), dataEnvio: new Date().toISOString().split('T')[0], lidos:[], ...c };
      _state.comunicados.push(nc); _saveToStorage(); return nc;
    },
    markComunicadoLido(comId, repId) {
      const i = _state.comunicados.findIndex(c=>c.id===comId);
      if(i>=0 && !_state.comunicados[i].lidos.includes(repId)){
        _state.comunicados[i].lidos.push(repId); _saveToStorage();
      }
    },
    deleteComunicado(id) { _state.comunicados=_state.comunicados.filter(c=>c.id!==id); _saveToStorage(); },

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
      const nc = { id: 'c' + _state.clientes.length, dataCadastro: new Date().toISOString().split('T')[0], qtdOrcamentos: 0, totalOrcado: 0, ativo: true, ...c };
      _state.clientes.push(nc);
      _saveToStorage();
      return nc;
    },
    updateCliente(id, updates) {
      const idx = _state.clientes.findIndex(c => c.id === id);
      if (idx >= 0) { _state.clientes[idx] = {..._state.clientes[idx], ...updates}; _saveToStorage(); }
    },
    deleteCliente(id) {
      _state.clientes = _state.clientes.filter(c => c.id !== id);
      _saveToStorage();
    },

    // Comissões
    getComissoes(filtros = {}) {
      let list = [..._state.comissoes];
      // Escopo restrito
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
      _saveToStorage();
      return nc;
    },
    updateComissao(id, updates) {
      const idx = _state.comissoes.findIndex(c => c.id === id);
      if (idx >= 0) { _state.comissoes[idx] = {..._state.comissoes[idx], ...updates}; _saveToStorage(); return _state.comissoes[idx]; }
    },
    getComissaoById(id) { return _state.comissoes.find(c => c.id === id); },
    setComissaoComprovante(comId, base64) {
      try { localStorage.setItem(`friomac_com_file_${comId}`, base64); } catch(e) {}
    },
    getComissaoComprovante(comId) {
      try { return localStorage.getItem(`friomac_com_file_${comId}`); } catch(e) { return null; }
    },

    // Entregas
    getEntregas() { return [..._state.entregas]; },
    addEntrega(e) {
      const ne = { id: 'ent' + _state.entregas.length, diasAtraso: 0, statusEntrega: 'NO PRAZO', satisfacao: 5, ...e };
      _state.entregas.push(ne);
      _saveToStorage();
      return ne;
    },
    updateEntrega(id, updates) {
      const idx = _state.entregas.findIndex(e => e.id === id);
      if (idx >= 0) { _state.entregas[idx] = {..._state.entregas[idx], ...updates}; _saveToStorage(); }
    },

    // Orçamentos
    getOrcamentos() { return [..._state.orcamentos]; },
    addOrcamento(o) {
      const no = { id: 'orc' + _state.orcamentos.length, data: new Date().toISOString().split('T')[0], status: 'EM ABERTO', ...o };
      _state.orcamentos.push(no);
      _saveToStorage();
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

    resetData() {
      localStorage.removeItem('friomac_crm_data');
      _loadFromStorage();
    },
  };
})();
