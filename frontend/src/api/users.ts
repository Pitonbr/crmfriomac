import { http } from '@/lib/http';
import { type AuditLog, AuditLogSchema, type UserOut, UserOutSchema } from './schemas';
import { z } from 'zod';

export interface UserCreatePayload {
  nome: string;
  email: string;
  telefone?: string | null;
  role: string;
}

export interface UserUpdatePayload {
  nome?: string;
  email?: string;
  telefone?: string | null;
  role?: string;
  ativo?: boolean;
}

export interface UserCreatedResponse {
  user: UserOut;
  senha_provisoria: string;
}

const UserCreatedResponseSchema = z.object({
  user: UserOutSchema,
  senha_provisoria: z.string(),
});

export async function listUsers(): Promise<UserOut[]> {
  const data = await http<unknown>('/api/v1/users');
  return z.array(UserOutSchema).parse(data);
}

export async function createUser(payload: UserCreatePayload): Promise<UserCreatedResponse> {
  const data = await http<unknown>('/api/v1/users', { method: 'POST', body: payload });
  return UserCreatedResponseSchema.parse(data);
}

export async function updateUser(id: string, payload: UserUpdatePayload): Promise<UserOut> {
  const data = await http<unknown>(`/api/v1/users/${id}`, { method: 'PATCH', body: payload });
  return UserOutSchema.parse(data);
}

export async function toggleUser(id: string): Promise<UserOut> {
  const data = await http<unknown>(`/api/v1/users/${id}/toggle`, { method: 'POST' });
  return UserOutSchema.parse(data);
}

export async function resetUserPassword(id: string): Promise<{ senha_provisoria: string; user_nome: string }> {
  const data = await http<unknown>(`/api/v1/users/${id}/reset-password`, { method: 'POST' });
  return data as { senha_provisoria: string; user_nome: string };
}

export async function deleteUser(id: string): Promise<void> {
  await http<void>(`/api/v1/users/${id}`, { method: 'DELETE' });
}

export async function getAuditLog(): Promise<AuditLog[]> {
  const data = await http<unknown>('/api/v1/users/audit-log');
  return z.array(AuditLogSchema).parse(data);
}
