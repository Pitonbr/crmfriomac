import { http } from '@/lib/http';

import { type CurrentUser, CurrentUserSchema, type LoginResponse, LoginResponseSchema } from './schemas';

export interface LoginPayload {
  email: string;
  senha: string;
  tenant_slug?: string;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const data = await http<unknown>('/api/v1/auth/login', {
    method: 'POST',
    body: { tenant_slug: 'friomac', ...payload },
    skipRefresh: true,
  });
  return LoginResponseSchema.parse(data);
}

export async function logout(): Promise<void> {
  await http<void>('/api/v1/auth/logout', { method: 'POST', skipRefresh: true });
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const data = await http<unknown>('/api/v1/auth/me');
  return CurrentUserSchema.parse(data);
}

export interface ChangePasswordPayload {
  senha_atual: string;
  senha_nova: string;
  senha_confirmacao: string;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<CurrentUser> {
  const data = await http<unknown>('/api/v1/auth/change-password', {
    method: 'POST',
    body: payload,
    skipRefresh: true,
  });
  return CurrentUserSchema.parse(data);
}
