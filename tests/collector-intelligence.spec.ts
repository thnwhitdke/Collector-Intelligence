import { test, expect } from '@playwright/test';

const BASE_URL = 'https://www.collectorsintelligence.com';

test('homepage loads', async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page).toHaveTitle(/Collector/i);
});

test('sign in page loads', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);

  await expect(page.locator('body')).toContainText(/Sign In/i);
  await expect(page.locator('body')).toContainText(/Launch Intelligence OS/i);
  await expect(page.locator('body')).toContainText(/Create Free Account/i);
});

test('collection page redirects correctly', async ({ page }) => {
  await page.goto(`${BASE_URL}/collection`);

  await expect(page.locator('body')).toBeVisible();
});
