import { test, expect } from '@playwright/test';

test('landing loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'ScopeBridge' })).toBeVisible();
});

test('login page renders', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
});

test('client portal login renders', async ({ page }) => {
  await page.goto('/portal/login');
  await expect(page.getByRole('heading', { name: 'Client portal login' })).toBeVisible();
});

test('dashboard renders nav', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /Dashboard/ })).toBeVisible();
});
