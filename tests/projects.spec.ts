import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://dev.94.23.185.197.sslip.io/login');

  await page.getByRole('textbox', { name: 'Email' }).   fill('nico.mdr25@gmail.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('legacylegacy');
  await page.getByRole('button',  { name: 'Sign in' }). click();

  await page.getByRole('button',  { name: '+ New Project' }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill('Project Name');
  await page.getByRole('textbox', { name: 'Description' }).fill('Test Project description');
  await page.getByRole('button',  { name: 'Create project' }).click();
  await page.getByRole('button',  { name: '+ New board' }).click();
  await page.getByRole('textbox', { name: 'Board name' }).fill('First Board');
  await page.getByRole('button',  { name: 'Create board' }).click();
  await page.getByRole('button',  { name: '+ New board' }).click();
  await page.getByRole('textbox', { name: 'Board name' }).fill('Second Board');
  await page.getByRole('button',  { name: 'Create board' }).click();
  await page.getByRole('button',  { name: 'Delete First Board' }).click();
  await page.getByRole('button',  { name: 'Confirm board deletion' }).click();
  await page.getByRole('button',  { name: 'Rename Second Board' }).click();
  await page.getByRole('textbox', { name: 'Board name' }).click();
  await page.getByRole('textbox', { name: 'Board name' }).fill('New Second Board');
  await page.getByRole('button',  { name: 'Save changes' }).click();
  await page.getByRole('button',  { name: 'Edit project' }).click();
  await page.getByRole('textbox', { name: 'Project name' }).fill('New test project name');
  await page.getByRole('textbox', { name: 'Description' }).fill('New test description example');
  await page.getByRole('button',  { name: 'Save changes' }).click();

  await page.getByRole('link', { name: 'Open board New Second Board' }).click();
  await page.getByRole('button', { name: 'Add card' }).nth(1).click();
  await page.getByRole('textbox', { name: 'Task title...' }).fill('First task');
  await page.getByRole('textbox', { name: 'Assignee name' }).fill('Name');
  await page.getByRole('button', { name: 'Low' }).click();
  await page.getByRole('textbox', { name: 'Add details about this task...' }).fill('first task example description');
  await page.getByRole('button', { name: 'Create Task' }).click();
  await page.getByRole('button', { name: 'Add card' }).nth(2).click();
  await page.getByRole('textbox', { name: 'Task title...' }).fill('Second Task');
  await page.getByRole('button', { name: 'Low' }).click();
  await page.getByRole('textbox', { name: 'Add details about this task...' }).fill('second task description example');
  await page.getByRole('button', { name: 'Create Task' }).click();
  await page.getByRole('button', { name: 'Add card' }).first().click();
  await page.getByRole('textbox', { name: 'Task title...' }).fill('Finished task');
  await page.getByRole('textbox', { name: 'Assignee name' }).fill('Test');
  await page.getByRole('textbox', { name: 'Add details about this task...' }).fill('Finished task example');
  await page.getByRole('button', { name: 'Create Task' }).click();

  await page.getByText('Finished Task').first().dragTo(page.getByText('Done').first())

  await page.getByRole('button', { name: 'Projects' }).click();

  await page.getByRole('link',    { name: 'Open project New test project' }).nth(0).click();

  await expect(page.getByRole('heading')).toContainText('New test project name');

  await expect(page.locator('div').filter({ hasText: 'Project overview' }).nth(1)).toContainText('New test description example');
  await expect(page.getByRole('link', { name: 'Open board New Second Board' }).getByRole('strong')).toContainText('New Second Board');

  await page.getByRole('link', { name: 'Open board New Second Board' }).click();

  await expect(page.locator('div').filter({hasText: 'In Progress'})).toContainText(['First task', 'first task example description', 'Low'])
  await expect(page.locator('div').filter({hasText: 'Done'})).toContainText(['Second Task', 'second task description example', 'Low'])
  await expect(page.locator('div').filter({hasText: 'Done'})).toContainText(['Finished task', 'Finished task example', 'Medium'])

  await page.getByRole('button', { name: 'Projects' }).click();

  await page.getByRole('link',    { name: 'Open project New test project' }).nth(0).click();

  await page.getByRole('button', { name: 'Delete project' }).click();
  await page.getByRole('button', { name: 'Confirm deletion' }).click();
  
  for (const l of await page.getByRole('link').all()) {
    await expect(l).not.toContainText('New test project name')
  }
});