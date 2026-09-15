import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Projects' }).click();
  await page.getByText('Kanban Platform').click();
  await expect(page.getByRole('heading')).toContainText('Kanban Platform');
  await page.getByRole('button', { name: 'Open board' }).click();

  await page.mouse.move((await page.getByText('Design').boundingBox())?.x ?? 0, (await page.getByText('Design').boundingBox())?.y ?? 0)
  await page.mouse.down()
  await page.mouse.move((await page.getByText('In Progress').boundingBox())?.x ?? 0, (await page.getByText('In Progress').boundingBox())?.y ?? 0)
  await page.mouse.up()

});