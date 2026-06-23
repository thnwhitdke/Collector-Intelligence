import { test, expect } from '@playwright/test';

const BASE_URL = 'https://www.collectorsintelligence.com';

test('collection page loads after login', async ({ page }) => {
  const email = process.env.CI_TEST_EMAIL!;
  const password = process.env.CI_TEST_PASSWORD!;

  await page.goto(`${BASE_URL}/login`);

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);

  await page.click('button[type="submit"]');

  await page.waitForLoadState('networkidle');

  await page.goto(`${BASE_URL}/collection`);

  await expect(page.locator('body')).toBeVisible();
});
