/**
 * Smoke E2E — login + ver Kanban com leads.
 *
 * Pré-requisitos:
 *   - Stack rodando: make dev
 *   - Migrations + seed aplicados
 *   - Variável SMOKE_PASSWORD com a senha do admin do seed
 *
 * Run: pnpm test:e2e
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = process.env.SMOKE_EMAIL ?? 'admin@friomac.ind.br';
const ADMIN_PASS = process.env.SMOKE_PASSWORD ?? '8iHp9ANxNzM@AAot';

test.describe('Smoke', () => {
  test('login e Kanban carregam com leads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/FRIO.*MAC/);

    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/senha/i).fill(ADMIN_PASS);
    await page.getByRole('button', { name: /entrar/i }).click();

    // Após login, redireciona para /dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Sidebar deve mostrar item de Kanban (admin tem acesso)
    await page.getByRole('link', { name: /Gestão de Leads/i }).click();
    await expect(page).toHaveURL(/\/kanban/);

    // Pelo menos 1 coluna do funil
    await expect(page.getByText(/Novo Lead/i).first()).toBeVisible();
  });

  test('axe: tela de login sem violações críticas', async ({ page }) => {
    await page.goto('/login');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const critical = results.violations.filter((v) =>
      ['critical', 'serious'].includes(v.impact ?? ''),
    );
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });

  test('axe: dashboard sem violações críticas', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/senha/i).fill(ADMIN_PASS);
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const critical = results.violations.filter((v) =>
      ['critical', 'serious'].includes(v.impact ?? ''),
    );
    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });
});
