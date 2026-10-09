import { test, expect } from '@playwright/test';

// Mobile-viewport (Pixel 7, 412px) smoke of the main pages: no horizontal page
// scroll, key headings and forms usable.
test.use({ viewport: { width: 412, height: 915 } });

for (const [path, heading] of [
  ['/', 'Kill scope creep'],
  ['/login', 'Welcome back'],
  ['/register', 'Create your account'],
  ['/forgot-password', 'Forgot password'],
  ['/portal/login', 'Client Portal'],
] as const) {
  test(`mobile: ${path} renders without horizontal scroll`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollW).toBeLessThanOrEqual(412);
  });
}

test('mobile: dashboard shell usable when logged in', async ({ page }) => {
  const stamp = Date.now().toString(36);
  await page.goto('/register');
  await page.getByLabel('Name').fill('Mobile User');
  await page.getByLabel('Email').fill(`mob-${stamp}@example.com`);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  // Mobile sheet nav opens and links work.
  await page.getByLabel('Open menu').click();
  await page.getByRole('link', { name: 'Projects' }).click();
  await expect(page).toHaveURL(/\/projects/);
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollW).toBeLessThanOrEqual(412);
});
