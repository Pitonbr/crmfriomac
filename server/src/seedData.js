/* Dados seed portados de js/data.js — mesma fonte usada hoje pelo front-end,
   usados apenas para popular o banco na primeira inicialização. */

const ALL_MENUS = ['dashboard','kanban','orcamentos','clientes','vendedores','campanhas','comissoes','prazo','config'];
const ALL_EDIT = Object.fromEntries(ALL_MENUS.map(m => [m, 'edicao']));
const _VEND_MENUS = ['dashboard','kanban','orcamentos','campanhas','config'];
const _VEND_ACESSO = { dashboard:'visualizacao', kanban:'edicao', orcamentos:'edicao', campanhas:'visualizacao', config:'edicao' };
const _REP_MENUS = ['dashboard','kanban','campanhas','config'];
const _REP_ACESSO = { dashboard:'visualizacao', kanban:'edicao', campanhas:'visualizacao', config:'edicao' };

const USERS_SEED = [
  { id:'u_master1', nome:'Alex Piton', cargo:'Sócio Administrador', email:'admin@friomac.ind.br', telefone:'', login:'alex.piton', senha:'Friomac@1', role:'master', avatar:'AP', grupo:'Gestão', menuPermissoes:ALL_MENUS, tipoAcesso:{...ALL_EDIT}, ativo:true, senhaTemporaria:false, dataCadastro:'2026-04-28', criadoPor:null },
  { id:'u_master2', nome:'Ale Munoz', cargo:'Sócio Administrador', email:'alemunoz@uol.com.br', telefone:'', login:'ale.munoz', senha:'Friomac@2', role:'master', avatar:'AM', grupo:'Gestão', menuPermissoes:ALL_MENUS, tipoAcesso:{...ALL_EDIT}, ativo:true, senhaTemporaria:false, dataCadastro:'2026-04-28', criadoPor:null },
  { id:'u2', nome:'Caio Victor Volpiano', cargo:'Vendedor', email:'caio@friomac.ind.br', telefone:'(11) 99999-0001', login:'caio.victor', senha:'123456', role:'vendedor', repId:'r1', avatar:'CV', grupo:'Canal Próprio', menuPermissoes:[..._VEND_MENUS], tipoAcesso:{..._VEND_ACESSO}, ativo:true, senhaTemporaria:true, dataCadastro:'2026-04-28', criadoPor:'u_master1' },
  { id:'u3', nome:'Felipe Crescente Alves Maciel', cargo:'Vendedor', email:'felipe@friomac.ind.br', telefone:'(11) 99999-0002', login:'felipe.crescente', senha:'123456', role:'vendedor', repId:'r2', avatar:'FC', grupo:'Canal Próprio', menuPermissoes:[..._VEND_MENUS], tipoAcesso:{..._VEND_ACESSO}, ativo:true, senhaTemporaria:true, dataCadastro:'2026-04-28', criadoPor:'u_master1' },
  { id:'u4', nome:'Lauriberto Volpiano', cargo:'Representante', email:'lauriberto@friomac.ind.br', telefone:'', login:'lauriberto.volpiano', senha:'123456', role:'representante', repId:'r6', avatar:'LV', grupo:'Representantes', menuPermissoes:[..._REP_MENUS], tipoAcesso:{..._REP_ACESSO}, ativo:true, senhaTemporaria:true, dataCadastro:'2026-04-28', criadoPor:'u_master1' },
  { id:'u5', nome:'Pedro Taconelli Gallucci', cargo:'Vendedor', email:'pedro@friomac.ind.br', telefone:'', login:'pedro.gallucci', senha:'123456', role:'vendedor', repId:'r4', avatar:'PG', grupo:'Canal Próprio', menuPermissoes:[..._VEND_MENUS], tipoAcesso:{..._VEND_ACESSO}, ativo:true, senhaTemporaria:true, dataCadastro:'2026-04-28', criadoPor:'u_master1' },
  { id:'u_adm1', nome:'Matheus Moraes', cargo:'Gerente Comercial', email:'matheus@friomac.ind.br', telefone:'', login:'matheus.moraes', senha:'Friomac@Adm', role:'adm_geral', avatar:'MM', grupo:'Gestão', menuPermissoes:ALL_MENUS, tipoAcesso:{...ALL_EDIT}, ativo:true, senhaTemporaria:false, dataCadastro:'2026-05-04', criadoPor:'u_master1' },
];

const STAGES = [
  { id:'novo_lead', label:'Novo Lead', icon:'📥', sla:'2h', slaHoras:2, cor:'#0EA5E9', prob:10 },
  { id:'visita_loco', label:'Visita In Loco', icon:'🏢', sla:'72h', slaHoras:72, cor:'#7C3AED', prob:25 },
  { id:'orcamento_env', label:'Orçamento Enviado', icon:'📄', sla:'24h', slaHoras:24, cor:'#0D9488', prob:40 },
  { id:'follow_up', label:'Follow Up', icon:'📞', sla:'48h', slaHoras:48, cor:'#D97706', prob:55 },
  { id:'pre_projeto', label:'Pré-Projeto 2D/3D', icon:'📐', sla:'72h', slaHoras:72, cor:'#E8500A', prob:70 },
  { id:'visita_fech', label:'Visita Fechamento', icon:'🤝', sla:'48h', slaHoras:48, cor:'#DC2626', prob:80 },
  { id:'contrato_env', label:'Contrato Enviado', icon:'📋', sla:'24h', slaHoras:24, cor:'#16A34A', prob:90 },
  { id:'decisao_final', label:'Decisão Final', icon:'✅', sla:'—', slaHoras:0, cor:'#15803D', prob:100 },
];

const REPS_BASE = [
  { id:'r1', nome:'Caio Victor Volpiano', canal:'Canal Próprio', qtdOrc:4, totalOrc:149280, fechados:0, totalFech:0, comissao:3.5, cidade:'São Paulo', estado:'SP', email:'caio@friomac.ind.br', tel:'(11) 99999-0001' },
  { id:'r2', nome:'Felipe Crescente Alves Maciel', canal:'Canal Próprio', qtdOrc:1, totalOrc:92350, fechados:0, totalFech:0, comissao:3.5, cidade:'São Paulo', estado:'SP', email:'felipe@friomac.ind.br', tel:'(11) 99999-0002' },
  { id:'r3', nome:'Centrato (Leonardo Representante)', canal:'Representante', qtdOrc:0, totalOrc:0, fechados:0, totalFech:0, comissao:5.0, cidade:'Ribeirão Preto', estado:'SP', email:'centrato@rep.com.br', tel:'' },
  { id:'r4', nome:'Pedro Taconelli Gallucci', canal:'Canal Próprio', qtdOrc:0, totalOrc:0, fechados:0, totalFech:0, comissao:3.5, cidade:'São Paulo', estado:'SP', email:'pedro@friomac.ind.br', tel:'' },
  { id:'r5', nome:'Ronaldo José Torrezan', canal:'Representante', qtdOrc:0, totalOrc:0, fechados:0, totalFech:0, comissao:5.0, cidade:'Campinas', estado:'SP', email:'', tel:'' },
  { id:'r6', nome:'Lauriberto Volpiano', canal:'Representante', qtdOrc:3, totalOrc:168540, fechados:0, totalFech:0, comissao:5.0, cidade:'Bauru', estado:'SP', email:'', tel:'' },
  { id:'r7', nome:'Pedro Gallucci', canal:'Canal Próprio', qtdOrc:0, totalOrc:0, fechados:0, totalFech:0, comissao:3.5, cidade:'São Paulo', estado:'SP', email:'', tel:'' },
  { id:'r8', nome:'GLPereira Representações Comerciais Ltda', canal:'Representante', qtdOrc:0, totalOrc:0, fechados:0, totalFech:0, comissao:5.0, cidade:'Curitiba', estado:'PR', email:'', tel:'' },
  { id:'r9', nome:'Mazan Comércio e Repres. Comercial Equip', canal:'Representante', qtdOrc:0, totalOrc:0, fechados:0, totalFech:0, comissao:5.0, cidade:'Belo Horizonte', estado:'MG', email:'', tel:'' },
  { id:'r10', nome:'Friomac Indústria e Comércio (Canal Direto)', canal:'Canal Próprio', qtdOrc:0, totalOrc:0, fechados:0, totalFech:0, comissao:0, cidade:'Piracicaba', estado:'SP', email:'vendas@friomac.ind.br', tel:'(19) 3407-9500' },
  { id:'r11', nome:'Mario Camara Filho', canal:'Representante', qtdOrc:0, totalOrc:0, fechados:0, totalFech:0, comissao:5.0, cidade:'Porto Alegre', estado:'RS', email:'', tel:'' },
  { id:'r12', nome:'A4 Equipamentos Ltda', canal:'Representante', qtdOrc:0, totalOrc:0, fechados:0, totalFech:0, comissao:5.0, cidade:'Goiânia', estado:'GO', email:'', tel:'' },
  { id:'r13', nome:'Anderson — Tambaú', canal:'Representante', qtdOrc:0, totalOrc:0, fechados:0, totalFech:0, comissao:5.0, cidade:'Tambaú', estado:'SP', email:'', tel:'' },
  { id:'r14', nome:'Rafael Correa', canal:'Representante', qtdOrc:0, totalOrc:0, fechados:0, totalFech:0, comissao:5.0, cidade:'Santos', estado:'SP', email:'', tel:'' },
  { id:'r15', nome:'Gustavo Alcione de Freitas', canal:'Canal Próprio', qtdOrc:0, totalOrc:0, fechados:0, totalFech:0, comissao:3.5, cidade:'São Paulo', estado:'SP', email:'', tel:'' },
];

// Leads seed completos ficam em seedLeads.json (gerados a partir de LEADS_BASE em js/data.js)
const LEADS_BASE = require('./seedLeads.json');

const KPIS = {
  metaAnual: 12000000,
  totalOrcado: 4139837,
  totalFechado: 0,
  qtdOrcamentos: 65,
  qtdFechados: 0,
  taxaConversao: 0,
  ticketMedio: 0,
  vendedoresAtivos: 15,
  onTimeDelivery: 98,
  metas: { taxaConversao:35, ticketMedio:130000, orcMes:80, fechMes:20, receitaVendMes:350000 },
  mensal: [
    { mes:'Jan', qtdOrc:43, totalOrc:2397335, qtdFech:0, totalFech:0 },
    { mes:'Fev', qtdOrc:14, totalOrc:1353582, qtdFech:0, totalFech:0 },
    { mes:'Mar', qtdOrc:0, totalOrc:0, qtdFech:0, totalFech:0 },
    { mes:'Abr', qtdOrc:12, totalOrc:388920, qtdFech:0, totalFech:0 },
    { mes:'Mai', qtdOrc:0, totalOrc:0, qtdFech:0, totalFech:0 },
    { mes:'Jun', qtdOrc:0, totalOrc:0, qtdFech:0, totalFech:0 },
    { mes:'Jul', qtdOrc:0, totalOrc:0, qtdFech:0, totalFech:0 },
    { mes:'Ago', qtdOrc:0, totalOrc:0, qtdFech:0, totalFech:0 },
    { mes:'Set', qtdOrc:0, totalOrc:0, qtdFech:0, totalFech:0 },
    { mes:'Out', qtdOrc:0, totalOrc:0, qtdFech:0, totalFech:0 },
    { mes:'Nov', qtdOrc:0, totalOrc:0, qtdFech:0, totalFech:0 },
    { mes:'Dez', qtdOrc:0, totalOrc:0, qtdFech:0, totalFech:0 },
  ],
};

function buildClientesFromLeads() {
  const map = {};
  LEADS_BASE.forEach(l => {
    const key = (l.nomFantasia || l.cliente || '').trim().toUpperCase();
    if (key && !map[key]) {
      map[key] = {
        id: 'c' + Object.keys(map).length,
        nomeFantasia: l.nomFantasia || l.cliente,
        nomeCliente: l.nomeCliente || '',
        telefone: l.tel || '',
        email: l.email || '',
        canal: l.canal || '',
        cidade: '',
        estado: '',
        segmento: l.tags && l.tags[0] ? l.tags[0] : '',
        qtdOrcamentos: 1,
        totalOrcado: l.valor || 0,
        dataCadastro: l.dataAbertura,
        ativo: true,
        obs: '',
      };
    } else if (key && map[key]) {
      map[key].qtdOrcamentos++;
      map[key].totalOrcado += (l.valor || 0);
    }
  });
  return Object.values(map);
}

function seedMensagens() {
  const now = new Date().toISOString();
  return [
    { id:'msg_seed1', tipo:'sistema', titulo:'Bem-vindo ao Friomac CRM', conteudo:'Sistema inicializado com sucesso. Configure os usuários em Configurações > Usuários.', de:'sistema', para:'todos', dataEnvio:now, lidos:[], respostas:[] },
    { id:'msg_seed2', tipo:'alerta', titulo:'Pipeline: leads sem atividade', conteudo:'Existem leads com mais de 90 dias sem movimentação. Acesse o Kanban e revise as oportunidades em aberto.', de:'sistema', para:'todos', dataEnvio:now, lidos:[], respostas:[] },
  ];
}

module.exports = {
  users: USERS_SEED,
  stages: STAGES,
  reps: REPS_BASE,
  leads: LEADS_BASE,
  kpis: [{ id: 'kpis', ...KPIS }],
  clientes: buildClientesFromLeads(),
  mensagens: seedMensagens(),
  resetRequests: [],
  auditLog: [],
  comissoes: [],
  entregas: [],
  orcamentos: [],
  campanhas: [],
  solicitacoesMkt: [],
  repositorioMkt: [],
  comunicados: [],
};
