/**
 * Environment variables tipadas + validadas com Zod.
 *
 * Em DEV (Vite proxy): VITE_API_BASE_URL/VITE_WS_URL ficam vazios → fetch relativo
 * (mesmo origin do frontend, browser não vê cross-site).
 * Em PROD (Caddy): também same-origin, então pode ficar vazio.
 */
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default(''),
  VITE_WS_URL: z.string().default(''),
  VITE_APP_VERSION: z.string().optional(),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Configuração inválida em import.meta.env:', parsed.error.format());
  throw new Error('Variáveis de ambiente inválidas — veja console');
}

export const env = parsed.data;
