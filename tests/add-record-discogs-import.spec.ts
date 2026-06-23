import { test, expect } from '@playwright/test';

const BASE_URL = 'https://www.collectorsintelligence.com';

test('user can import a Discogs search result through add record flow', async ({ page }) => {
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

  await page.goto(`${BASE_URL}/collection`);

  await page.getByRole('button', { name: /\+ add record/i }).click();
  await page.getByRole('button', { name: /discogs/i }).click();

  await page
    .getByRole('textbox', { name: /search artist, title, catalog/i })
    .fill('Pink Floyd Animals');

  await page.locator('form').getByRole('button', { name: /^search$/i }).click();

  await expect(page.getByRole('button', { name: /^import$/i }).first()).toBeVisible({
    timeout: 20000,
  });

  await page.getByRole('button', { name: /^import$/i }).first().click();

  await expect(page.locator('body')).toContainText(/Pink Floyd|Animals|Add Record/i, {
    timeout: 20000,
  });

  await page.getByRole('button', { name: /^add record$/i }).click();

  await page.waitForURL(/\/collection/, { timeout: 20000 });

  await expect(page.locator('body')).toContainText(/Pink Floyd|Animals|collection/i, {
    timeout: 20000,
  });
});
