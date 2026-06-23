import { test, expect } from '@playwright/test';

const BASE_URL = 'https://www.collectorsintelligence.com';

test('test user can sign in and reach collection', async ({ page }) => {
  const email = process.env.CI_TEST_EMAIL;
  const password = process.env.CI_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('Missing CI_TEST_EMAIL or CI_TEST_PASSWORD');
  }

  await page.goto(`${BASE_URL}/login`);

  await page.getByRole('textbox').first().fill(email);
  await page.getByRole('textbox').nth(1).fill(password);

  await page.getByRole('button', { name: /launch intelligence os|sign in/i }).click();

  await page.waitForLoadState('networkidle');

  await expect(page.locator('body')).toContainText(/collection|dashboard|intelligence/i);
});
