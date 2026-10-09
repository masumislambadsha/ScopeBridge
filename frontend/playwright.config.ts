import { defineConfig, devices } from '@playwright/test';

const TEST_DB =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/scopebridge_test?schema=public";

const API_ENV = [
  `DATABASE_URL=${TEST_DB}`,
  `DIRECT_URL=${TEST_DB}`,
  "REDIS_URL=redis://localhost:6379",
  "FRONTEND_URL=http://localhost:3000",
  "JWT_ACCESS_SECRET=e2e-access-secret-0123456789abcdef",
  "JWT_REFRESH_SECRET=e2e-refresh-secret-0123456789abcdef",
  "AI_PROVIDER=mock",
  "STORAGE_DRIVER=local",
  "MAIL_ENABLED=true",
  "RATE_LIMIT_API_MAX=100000",
  "RATE_LIMIT_AUTH_MAX=100000",
  "RATE_LIMIT_AI_MAX=100000",
  "PORT=4100",
].join(" ");

/**
 * webServer boots the full stack (API + worker + frontend) with the mock AI
 * provider and local storage. Requires Postgres, Redis and Mailpit running
 * (brew services or `docker compose up -d`) plus `npm install` at the repo root.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 180_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },
  webServer: process.env.PW_NO_SERVER
    ? undefined
    : [
        {
          command: `bash -c "cd ../backend && ${API_ENV} npx prisma migrate deploy && ${API_ENV} npx tsx src/index.ts"`,
          port: 4100,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          command: `bash -c "cd ../backend && ${API_ENV} npx tsx src/workers/worker.ts"`,
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
