import { test, expect, devices } from '@playwright/test';

const BASE_URL = 'https://www.collectorsintelligence.com';

test.use({
  ...devices['iPhone 15 Pro'],
});

async function login(page: any) {
  const email = process.env.CI_TEST_EMAIL;
  const password = process.env.CI_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('Missing CI_TEST_EMAIL or CI_TEST_PASSWORD');
  }

  await page.goto(`${BASE_URL}/auth/login`);
  await page.getByRole('textbox', { name: /email/i }).fill(email);
  await page.getByRole('textbox', { name: /password/i }).fill(password);
  await page.getByRole('button', { name: /launch intelligence os|sign in/i }).click();
  await page.waitForLoadState('networkidle');
}

test('mobile login and collection load', async ({ page }) => {
  await login(page);
  await page.goto(`${BASE_URL}/collection`);
  await expect(page.locator('body')).toContainText(/collection|add record|search/i, {
    timeout: 15000,
  });
});

test('mobile pricing loads', async ({ page }) => {
  await page.goto(`${BASE_URL}/pricing`);
  await expect(page.locator('body')).toContainText(/pricing|free|collector|subscription|plan/i);
});
