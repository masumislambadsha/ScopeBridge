import { test, expect, Browser, Page } from '@playwright/test';

const MAILPIT = 'http://localhost:8025';
const stamp = Date.now().toString(36);

async function register(page: Page, name: string, email: string, inviteToken?: string) {
  await page.goto(inviteToken ? `/register?inviteToken=${inviteToken}` : '/register');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
}

async function inviteLinkTo(email: string): Promise<string> {
  // Read the invitation link from the Mailpit API.
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/messages`);
    const j = (await res.json()) as { messages?: Array<{ ID: string; To: Array<{ Address: string }> }> };
    const found = [...(j.messages ?? [])].reverse().find((m) => m.To?.some((t) => t.Address === email));
    if (found) {
      const body = await (await fetch(`${MAILPIT}/api/v1/message/${found.ID}`)).json() as { Text?: string };
      const m = /\/invite\/([a-f0-9]{32,})/.exec(body.Text ?? '');
      if (m) return m[1];
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`no invite email for ${email}`);
}

test('golden path: intake → v1 → tasks → CR → v2 → implemented', async ({ browser }: { browser: Browser }) => {
  test.slow(); // full lifecycle with AI polling takes several minutes
  const pmCtx = await browser.newContext();
  const clientCtx = await browser.newContext();
  const teamCtx = await browser.newContext();
  const pm = await pmCtx.newPage();
  const client = await clientCtx.newPage();
  const team = await teamCtx.newPage();

  const pmEmail = `e2e-pm-${stamp}@example.com`;
  const teamEmail = `e2e-dev-${stamp}@example.com`;
  const clientEmail = `e2e-client-${stamp}@example.com`;

  // 1. PM registers, creates workspace, invites team member + creates client.
  await register(pm, 'E2E PM', pmEmail);
  await expect(pm).toHaveURL(/\/dashboard/);
  await pm.goto('/workspaces');
  await pm.getByLabel('New workspace name').fill('E2E Agency');
  await pm.getByRole('button', { name: 'Create' }).click();
  await expect(pm.getByText('E2E Agency', { exact: true })).toBeVisible();
  await pm.goto('/settings/members');
  await pm.getByLabel('Email').fill(teamEmail);
  await pm.getByRole('button', { name: 'Invite' }).click();
  await expect(pm.getByText(teamEmail)).toBeVisible();
  await pm.goto('/clients');
  await pm.getByLabel('Name').fill('E2E Client Co');
  await pm.getByLabel('Email').fill(clientEmail);
  await pm.getByRole('button', { name: 'Add client' }).click();
  await expect(pm.getByText('E2E Client Co').first()).toBeVisible();

  // Team member accepts via Mailpit link.
  const teamToken = await inviteLinkTo(teamEmail);
  await register(team, 'E2E Dev', teamEmail, teamToken);
  await expect(team).toHaveURL(/\/dashboard/);

  // 2. PM invites client to portal + creates e-commerce project.
  await pm.goto('/clients');
  await pm.getByRole('link', { name: 'E2E Client Co' }).first().click();
  await pm.getByRole('button', { name: 'Invite to portal' }).click();
  await expect(pm.getByText('portal access', { exact: false })).toBeVisible();
  await pm.goto('/projects/new');
  await pm.getByLabel('Client').selectOption('E2E Client Co');
  await pm.getByLabel('Name').fill('E2E Shop');
  await pm.getByLabel('Project type').selectOption('E_COMMERCE');
  await pm.getByRole('button', { name: 'Create project' }).click();
  // Wait for the detail page itself (not just /projects/* — "new" would match too).
  await expect(pm.getByRole('tab', { name: 'Overview', exact: true })).toBeVisible({ timeout: 30000 });
  const projectUrl = pm.url();
  const projectId = projectUrl.split('/projects/')[1].split(/[?#]/)[0];

  // 3. PM generates AI checklist questions + sends the information request.
  await pm.getByRole('tab', { name: 'Requests', exact: true }).click();
  await pm.getByLabel('Title').fill('E2E discovery');
  await pm.getByRole('button', { name: 'AI suggest questions' }).click();
  await expect(pm.getByText(/remove/).first()).toBeVisible();
  await pm.getByRole('button', { name: /Create request/ }).click();
  await expect(pm.getByText('E2E discovery').first()).toBeVisible();
  await pm.getByRole('button', { name: 'Send' }).click();
  await pm.getByRole('button', { name: 'Send', exact: true }).last().click();
  await expect(pm.getByText('SENT').first()).toBeVisible();

  // 4. Client accepts invite, answers, uploads PDF.
  const clientToken = await inviteLinkTo(clientEmail);
  await register(client, 'E2E Client', clientEmail, clientToken);
  await expect(client).toHaveURL(/\/portal/);
  await client.goto(`/portal/projects/${projectId}`);
  await expect(client.getByText('E2E Shop').first()).toBeVisible();
  await client.getByText('E2E discovery').click();
  await client.getByLabel(/Describe|goals|business/i).first().fill('We sell handmade soaps online');
  await client.setInputFiles('#files', 'tests/fixtures/catalog.pdf');
  await client.getByRole('button', { name: 'Submit answers' }).click();
  await expect(client.getByText(/submitted/i)).toBeVisible();

  // 5. Requirements extracted → readiness → clarification → answer.
  await pm.getByRole('tab', { name: 'Requirements', exact: true }).click();
  await expect.poll(async () => pm.getByText(/REQ-/).count(), { timeout: 90_000 }).toBeGreaterThan(0);
  await expect(pm.getByText(/Readiness/)).toBeVisible({ timeout: 90_000 });
  await pm.getByRole('checkbox').first().check();
  await pm.getByRole('button', { name: /Request clarification/ }).click();
  await pm.getByLabel(/Question for the client/).fill('Which payment gateway?');
  await pm.getByRole('button', { name: 'Send clarification request' }).click();
  await client.goto(`/portal/projects/${projectId}`);
  await client.getByText(/Clarification/i).first().click();
  await client.locator('textarea, input[type="text"]').first().fill('Stripe');
  await client.getByRole('button', { name: 'Submit answers' }).click();
  await expect(client.getByText(/submitted/i)).toBeVisible();

  // 6. PM marks ready, builds v1, generates criteria, edits, sends.
  await pm.getByRole('checkbox').first().check();
  await pm.getByRole('button', { name: /Mark ready/ }).click();
  await pm.getByRole('button', { name: 'Approve' }).first().click();
  await pm.getByRole('button', { name: 'Approve', exact: true }).last().click();
  await pm.getByRole('tab', { name: 'Scope', exact: true }).click();
  await pm.getByRole('button', { name: 'Create scope' }).click();
  await expect(pm.getByText(/v1/).first()).toBeVisible();
  await pm.getByRole('button', { name: /Generate acceptance criteria/ }).click();
  await pm.getByRole('button', { name: 'Edit draft' }).click({ timeout: 90_000 });
  await pm.getByRole('button', { name: /\+ REQ-/ }).first().click();
  await pm.getByLabel('Feature title').fill('E2E flagship feature');
  await pm.getByRole('button', { name: 'Save draft' }).click();
  await pm.getByRole('button', { name: 'Send for approval' }).click();
  await pm.getByRole('button', { name: 'Send', exact: true }).last().click();
  await expect(pm.getByRole('heading', { name: /PENDING APPROVAL/ })).toBeVisible();

  // 7. Client approves v1 → certificate.
  await client.goto(`/portal/projects/${projectId}/scope`);
  await client.getByRole('button', { name: 'Approve' }).click();
  await client.getByLabel(/full name as signature/i).fill('E2E Client');
  await client.getByRole('button', { name: 'Confirm' }).click();
  await expect(client.locator('li', { hasText: 'APPROVED' }).first()).toBeVisible();

  // 8. PM generates tasks, assigns; team → REVIEW; PM completes.
  await pm.getByRole('tab', { name: 'Tasks', exact: true }).click();
  await pm.getByRole('button', { name: /Generate from approved scope/ }).click();
  await pm.getByRole('button', { name: /Preview from v1/ }).click();
  await expect(pm.getByText(/proposed tasks/)).toBeVisible({ timeout: 60_000 });
  await pm.getByRole('button', { name: /Confirm \+ create/ }).click();
  await expect(pm.getByText(/TASK-/).first()).toBeVisible();
  await pm.getByRole('button', { name: 'List', exact: true }).click();
  await pm.getByLabel('Assign task').first().selectOption({ label: 'E2E Dev' });
  await team.goto('/tasks');
  const review = team.getByLabel('Move task').first();
  await review.selectOption('REVIEW');
  const statuses0 = pm.getByLabel('Move task');
  await statuses0.first().selectOption('COMPLETED');

  // 9. Client submits Wishlist CR → AI OUT_OF_SCOPE + impact.
  await client.goto(`/portal/projects/${projectId}/change-requests`);
  await client.getByLabel('Title').fill('Wishlist');
  await client.getByLabel('Description').fill('Customers want a wishlist page with sharing');
  await client.getByRole('button', { name: 'Submit request' }).click();
  await expect(client.getByText('Wishlist').first()).toBeVisible();
  await pm.getByRole('tab', { name: 'Change Requests', exact: true }).click();
  await pm.getByRole('button', { name: 'Review' }).first().click();
  await expect.poll(async () => pm.getByText(/OUT OF SCOPE|IN SCOPE|POSSIBLY RELATED/).count(), { timeout: 90_000 }).toBeGreaterThan(0);

  // 10. PM approves with new version → v2 sent → client approves → v1 SUPERSEDED, CR APPROVED.
  await pm.getByRole('button', { name: /Approve/ }).click();
  await pm.getByLabel(/New feature title/).fill('Wishlist page');
  await pm.getByRole('button', { name: 'Confirm approval' }).click();
  await expect(pm.getByText(/v\(n\+1\) draft proposed/)).toBeVisible();
  await pm.keyboard.press('Escape');
  await pm.getByRole('tab', { name: 'Scope', exact: true }).click();
  // Fresh queries: reload to drop any cached scope data, then pick v2.
  await pm.reload();
  await expect(pm.getByRole('tab', { name: 'Scope', exact: true })).toBeVisible();
  await pm.getByRole('tab', { name: 'Scope', exact: true }).click();
  await pm.getByLabel('Version').selectOption('v2 — DRAFT');
  await pm.getByRole('button', { name: 'Send for approval' }).click();
  await pm.getByRole('button', { name: 'Send', exact: true }).last().click();
  await client.goto(`/portal/projects/${projectId}/scope`);
  await client.getByRole('button', { name: 'Approve' }).click();
  await client.getByLabel(/full name as signature/i).fill('E2E Client');
  await client.getByRole('button', { name: 'Confirm' }).click();
  await pm.getByRole('tab', { name: 'Change Requests', exact: true }).click();
  await expect(pm.locator('span.rounded-full', { hasText: 'APPROVED' }).first()).toBeVisible();

  // 11. New tasks generated + completed → IMPLEMENTED.
  await pm.getByRole('tab', { name: 'Tasks', exact: true }).click();
  await pm.getByRole('button', { name: /Generate from approved scope/ }).click();
  await pm.getByRole('button', { name: /Preview from v2/ }).click();
  await pm.getByRole('button', { name: /Confirm \+ create/ }).click();
  await pm.getByRole('button', { name: 'List', exact: true }).click();
  const statuses = pm.getByLabel('Move task');
  for (let i = 0; i < (await statuses.count()); i++) {
    await statuses.nth(i).selectOption('COMPLETED');
  }

  // 12. Dashboard counts + activity entries.
  await pm.goto('/dashboard');
  await expect(pm.getByText(/Projects/).first()).toBeVisible();
  await pm.goto(`/projects/${projectId}`);
  await pm.getByRole('tab', { name: 'Activity', exact: true }).click();
  await expect(pm.getByText('scope.version.approved').first()).toBeVisible();
  await expect(pm.getByText('cr.implemented').first()).toBeVisible();

  await pmCtx.close();
  await clientCtx.close();
  await teamCtx.close();
});
