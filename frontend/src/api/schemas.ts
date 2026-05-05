import { z } from 'zod';

// ── Auth ────────────────────────────────────────────────────────────
export const UserRoleSchema = z.enum(['master', 'vendedor', 'representante']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const CurrentUserSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  nome: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  avatar: z.string().nullable().optional(),
  grupo: z.string().nullable().optional(),
});
export type CurrentUser = z.infer<typeof CurrentUserSchema>;

export const LoginResponseSchema = z.object({ user: CurrentUserSchema });
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// ── Stage ───────────────────────────────────────────────────────────
export const StageSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  label: z.string(),
  icone: z.string().nullable().optional(),
  sla_horas: z.number().int(),
  cor: z.string(),
  prob_pct: z.number().int(),
  ordem: z.number().int(),
  ativo: z.boolean(),
});
export type Stage = z.infer<typeof StageSchema>;

// ── Cliente ─────────────────────────────────────────────────────────
export const ClienteSchema = z.object({
  id: z.string().uuid(),
  razao_social: z.string().nullable().optional(),
  nome_fantasia: z.string(),
  nome_contato: z.string().nullable().optional(),
  cnpj: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  telefone: z.string().nullable().optional(),
  cidade: z.string().nullable().optional(),
  estado: z.string().nullable().optional(),
  segmento: z.string().nullable().optional(),
  canal: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  ativo: z.boolean(),
});
export type Cliente = z.infer<typeof ClienteSchema>;

// ── Representante ───────────────────────────────────────────────────
export const CanalRepSchema = z.enum(['canal_proprio', 'representante']);
export type CanalRep = z.infer<typeof CanalRepSchema>;

export const RepresentanteSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable().optional(),
  nome: z.string(),
  canal: CanalRepSchema,
  comissao_pct: z.coerce.number(),
  cidade: z.string().nullable().optional(),
  estado: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  telefone: z.string().nullable().optional(),
  ativo: z.boolean(),
});
export type Representante = z.infer<typeof RepresentanteSchema>;

// ── Lead ────────────────────────────────────────────────────────────
export const LeadPrioridadeSchema = z.enum(['baixa', 'media', 'alta']);
export type LeadPrioridade = z.infer<typeof LeadPrioridadeSchema>;

export const LeadStatusSchema = z.enum(['em_aberto', 'ganho', 'perdido', 'em_producao']);
export type LeadStatus = z.infer<typeof LeadStatusSchema>;

export const LeadSchema = z.object({
  id: z.string().uuid(),
  codigo: z.string(),
  codigo_legado: z.string().nullable().optional(),
  cliente_id: z.string().uuid(),
  representante_id: z.string().uuid().nullable().optional(),
  stage_id: z.string().uuid(),
  criado_por: z.string().uuid().nullable().optional(),
  projeto: z.string().nullable().optional(),
  valor: z.coerce.number(),
  prioridade: LeadPrioridadeSchema,
  status: LeadStatusSchema,
  motivo_perda: z.string().nullable().optional(),
  data_abertura: z.string(),
  data_ultima_movimentacao: z.string(),
  sla_deadline: z.string().nullable().optional(),
  tags: z.array(z.string()),
  metadados: z.record(z.string(), z.unknown()),
  ganho_em: z.string().nullable().optional(),
  perdido_em: z.string().nullable().optional(),
  criado_em: z.string(),
  atualizado_em: z.string(),
});
export type Lead = z.infer<typeof LeadSchema>;

// ── Observacao ──────────────────────────────────────────────────────
export const ObservacaoTipoSchema = z.enum([
  'manual',
  'sistema',
  'whatsapp',
  'email',
  'auditoria',
]);
export type ObservacaoTipo = z.infer<typeof ObservacaoTipoSchema>;

export const ObservacaoSchema = z.object({
  id: z.string().uuid(),
  lead_id: z.string().uuid(),
  autor_id: z.string().uuid().nullable().optional(),
  autor_nome: z.string(),
  texto: z.string(),
  tipo: ObservacaoTipoSchema,
  criado_em: z.string(),
});
export type Observacao = z.infer<typeof ObservacaoSchema>;

// ── Orcamento / Comissao / Entrega (Sprint 4) ───────────────────────
export const OrcamentoStatusSchema = z.enum([
  'rascunho',
  'enviado',
  'aceito',
  'recusado',
  'expirado',
]);
export type OrcamentoStatus = z.infer<typeof OrcamentoStatusSchema>;

export const OrcamentoSchema = z.object({
  id: z.string().uuid(),
  lead_id: z.string().uuid(),
  numero: z.string(),
  versao: z.number().int(),
  valor_total: z.coerce.number(),
  status: OrcamentoStatusSchema,
  data_envio: z.string().nullable().optional(),
  validade_ate: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  criado_por: z.string().uuid().nullable().optional(),
  criado_em: z.string(),
  atualizado_em: z.string(),
});
export type Orcamento = z.infer<typeof OrcamentoSchema>;

export const ComissaoStatusSchema = z.enum([
  'pendente',
  'aprovada',
  'paga',
  'cancelada',
]);
export type ComissaoStatus = z.infer<typeof ComissaoStatusSchema>;

export const ComissaoSchema = z.object({
  id: z.string().uuid(),
  representante_id: z.string().uuid(),
  lead_id: z.string().uuid(),
  orcamento_id: z.string().uuid().nullable().optional(),
  valor_base: z.coerce.number(),
  percentual: z.coerce.number(),
  valor_comissao: z.coerce.number(),
  status: ComissaoStatusSchema,
  comprovante_id: z.string().uuid().nullable().optional(),
  data_pagamento: z.string().nullable().optional(),
  criado_em: z.string(),
  atualizado_em: z.string(),
});
export type Comissao = z.infer<typeof ComissaoSchema>;

export const EntregaStatusSchema = z.enum([
  'planejada',
  'em_producao',
  'entregue',
  'atrasada',
]);
export type EntregaStatus = z.infer<typeof EntregaStatusSchema>;

export const EntregaSchema = z.object({
  id: z.string().uuid(),
  lead_id: z.string().uuid(),
  prazo_estimado: z.string().nullable().optional(),
  prazo_real: z.string().nullable().optional(),
  status: EntregaStatusSchema,
  observacoes: z.string().nullable().optional(),
  criado_em: z.string(),
  atualizado_em: z.string(),
});
export type Entrega = z.infer<typeof EntregaSchema>;

// ── Dashboard KPIs ──────────────────────────────────────────────────
export const FunilStageSchema = z.object({
  stage_id: z.string(),
  label: z.string(),
  cor: z.string(),
  ordem: z.number().int(),
  qtd_leads: z.number().int(),
  valor_total: z.coerce.number(),
});
export type FunilStage = z.infer<typeof FunilStageSchema>;

export const TopRepSchema = z.object({
  representante_id: z.string(),
  nome: z.string(),
  qtd_leads: z.number().int(),
  valor_total: z.coerce.number(),
});
export type TopRep = z.infer<typeof TopRepSchema>;

export const MesAggSchema = z.object({
  mes: z.string(),
  qtd_orc: z.number().int(),
  valor_orc: z.coerce.number(),
  qtd_fech: z.number().int(),
  valor_fech: z.coerce.number(),
});
export type MesAgg = z.infer<typeof MesAggSchema>;

// ── Notificacao ─────────────────────────────────────────────────────
export const NotificacaoTipoSchema = z.enum([
  'sla_estourando',
  'sla_estourado',
  'lead_ganho',
  'lead_perdido',
  'comissao_nova',
  'entrega_proxima',
  'sistema',
]);
export type NotificacaoTipo = z.infer<typeof NotificacaoTipoSchema>;

export const NotificacaoSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  tipo: NotificacaoTipoSchema,
  titulo: z.string(),
  mensagem: z.string(),
  link: z.string().nullable().optional(),
  lida_em: z.string().nullable().optional(),
  criado_em: z.string(),
});
export type Notificacao = z.infer<typeof NotificacaoSchema>;

export const NotificacoesUnreadSchema = z.object({
  total: z.number().int(),
  unread: z.number().int(),
  items: z.array(NotificacaoSchema),
});
export type NotificacoesUnread = z.infer<typeof NotificacoesUnreadSchema>;

export const DashboardKPIsSchema = z.object({
  meta_anual: z.coerce.number(),
  total_orcado: z.coerce.number(),
  total_fechado: z.coerce.number(),
  qtd_leads_abertos: z.number().int(),
  qtd_leads_ganhos: z.number().int(),
  qtd_leads_perdidos: z.number().int(),
  taxa_conversao: z.number(),
  ticket_medio: z.coerce.number(),
  valor_pipeline_ponderado: z.coerce.number(),
  funil: z.array(FunilStageSchema),
  top_reps: z.array(TopRepSchema),
  mensal: z.array(MesAggSchema),
});
export type DashboardKPIs = z.infer<typeof DashboardKPIsSchema>;
