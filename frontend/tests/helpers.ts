import { Page } from '@playwright/test';

export const MAILPIT = 'http://localhost:8025';

export async function register(page: Page, name: string, email: string, inviteToken?: string) {
  await page.goto(inviteToken ? `/register?inviteToken=${inviteToken}` : '/register');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
}

export async function inviteLinkTo(email: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/messages`);
    const j = (await res.json()) as { messages?: Array<{ ID: string; To: Array<{ Address: string }> }> };
    const found = [...(j.messages ?? [])].reverse().find((m) => m.To?.some((t) => t.Address === email));
    if (found) {
      const body = (await (await fetch(`${MAILPIT}/api/v1/message/${found.ID}`)).json()) as { Text?: string };
      const m = /\/invite\/([a-f0-9]{32,})/.exec(body.Text ?? '');
      if (m) return m[1];
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`no invite email for ${email}`);
}
