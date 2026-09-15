import { test, expect } from '@playwright/test';

test('First test', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('front');
});
