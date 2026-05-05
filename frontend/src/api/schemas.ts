import { z } from 'zod';

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

export const LoginResponseSchema = z.object({
  user: CurrentUserSchema,
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
