/**
 * Environment variables tipadas + validadas com Zod.
 */
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:8000'),
  VITE_WS_URL: z.string().default('ws://localhost:8000'),
  VITE_APP_VERSION: z.string().optional(),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Configuração inválida em import.meta.env:', parsed.error.format());
  throw new Error('Variáveis de ambiente inválidas — veja console');
}

export const env = parsed.data;
