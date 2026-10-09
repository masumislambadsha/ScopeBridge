import { test, expect, Browser } from '@playwright/test';
import { register, inviteLinkTo } from './helpers';

const stamp = Date.now().toString(36);

test('client cannot see internal data or agency routes', async ({ browser }: { browser: Browser }) => {
  test.slow(); // Mailpit polling + multi-context flows
  const pmCtx = await browser.newContext();
  const clientCtx = await browser.newContext();
  const anonCtx = await browser.newContext();
  const pm = await pmCtx.newPage();
  const client = await clientCtx.newPage();
  const anon = await anonCtx.newPage();

  const pmEmail = `neg-pm-${stamp}@example.com`;
  const clientEmail = `neg-client-${stamp}@example.com`;

  // Agency setup: workspace, client + portal invite, project, INTERNAL message.
  await register(pm, 'Neg PM', pmEmail);
  await expect(pm).toHaveURL(/\/dashboard/);
  await pm.goto('/workspaces');
  await pm.getByLabel('New workspace name').fill('Neg Agency');
  await pm.getByRole('button', { name: 'Create' }).click();
  await pm.goto('/clients');
  await pm.getByLabel('Name').fill('Neg Co');
  await pm.getByLabel('Email').fill(clientEmail);
  await pm.getByRole('button', { name: 'Add client' }).click();
  await pm.getByRole('link', { name: 'Neg Co' }).first().click();
  await pm.getByRole('button', { name: 'Invite to portal' }).click();
  await pm.goto('/projects/new');
  await pm.getByLabel('Client').selectOption('Neg Co');
  await pm.getByLabel('Name').fill('Neg Project');
  await pm.getByRole('button', { name: 'Create project' }).click();
  await expect(pm).toHaveURL(/\/projects\/.+/);
  const projectId = pm.url().split('/projects/')[1].split(/[?#]/)[0];
  await pm.getByRole('tab', { name: 'Messages', exact: true }).click();
  await pm.getByLabel('Message').fill('Secret internal note');
  await pm.getByLabel('Visibility').selectOption('INTERNAL');
  await pm.getByRole('button', { name: 'Send' }).click();
  await expect(pm.getByText('Secret internal note')).toBeVisible();
  await pm.getByLabel('Message').fill('Hello client');
  await pm.getByLabel('Visibility').selectOption('CLIENT');
  await pm.getByRole('button', { name: 'Send' }).click();
  await expect(pm.getByText('Hello client').first()).toBeVisible();

  // Client with portal access.
  const token = await inviteLinkTo(clientEmail);
  await register(client, 'Neg Client', clientEmail, token);
  await expect(client).toHaveURL(/\/portal/);

  // Sees CLIENT messages, never INTERNAL ones.
  await client.goto(`/portal/projects/${projectId}/messages`);
  await expect(client.getByText('Hello client')).toBeVisible();
  await expect(client.getByText('Secret internal note')).toHaveCount(0);

  // Agency routes bounce client-only users to the portal.
  await client.goto(`/projects/${projectId}`);
  await expect(client).toHaveURL(/\/portal/);
  await client.goto('/dashboard');
  await expect(client).toHaveURL(/\/portal/);

  // Unauthenticated users bounce to login.
  await anon.goto('/dashboard');
  await expect(anon).toHaveURL(/\/login/);
  await anon.goto(`/projects/${projectId}`);
  await expect(anon).toHaveURL(/\/login/);

  await pmCtx.close();
  await clientCtx.close();
  await anonCtx.close();
});
