import { defineConfig, devices } from '@playwright/test';

/**
 * webServer boots the full stack (API + worker + frontend) with the mock AI
 * provider and local storage. Requires Postgres, Redis and Mailpit running
 * (brew services or `docker compose up -d`) plus `npm install` at the repo root.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 180_000,
  expect: { timeout: 20_000 },
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3000' },
  webServer: process.env.PW_NO_SERVER
    ? undefined
    : [
        {
          command:
            'bash -c "cd ../backend && AI_PROVIDER=mock STORAGE_DRIVER=local MAIL_ENABLED=true PORT=4100 DATABASE_URL=${TEST_DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/scopebridge_test?schema=public} DIRECT_URL=${TEST_DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/scopebridge_test?schema=public} npx prisma migrate deploy && AI_PROVIDER=mock STORAGE_DRIVER=local MAIL_ENABLED=true PORT=4100 DATABASE_URL=${TEST_DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/scopebridge_test?schema=public} DIRECT_URL=${TEST_DATABASE_URL} npx tsx src/index.ts"',
          port: 4100,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command:
            'bash -c "cd ../backend && AI_PROVIDER=mock STORAGE_DRIVER=local PORT=4100 DATABASE_URL=${TEST_DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/scopebridge_test?schema=public} DIRECT_URL=${TEST_DATABASE_URL} npx tsx src/workers/worker.ts"',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: 'bash -c "BACKEND_URL=http://localhost:4100 NEXT_PUBLIC_API_URL=http://localhost:4100 NEXT_PUBLIC_SOCKET_URL=http://localhost:4100 npx next start -p 3000"',
          port: 3000,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: [/mobile\.spec/] },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: [/mobile\.spec/] },
  ],
});
