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
