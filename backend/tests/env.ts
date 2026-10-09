/** Shared test-database constants. Imported by setup + global-setup (same values). */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/scopebridge_test";

export function testEnv() {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL ??= TEST_DATABASE_URL;
  process.env.DIRECT_URL ??= process.env.DATABASE_URL;
  process.env.REDIS_URL ??= "redis://localhost:6379";
  process.env.FRONTEND_URL ??= "http://localhost:3000";
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret-0123456789abcdef";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-0123456789abcdef";
  process.env.AI_PROVIDER ??= "mock";
  process.env.STORAGE_DRIVER ??= "local";
  process.env.MAIL_ENABLED ??= "false";
  process.env.RATE_LIMIT_WINDOW_MS ??= "60000";
  process.env.RATE_LIMIT_API_MAX ??= "100000";
  process.env.RATE_LIMIT_AUTH_MAX ??= "100000";
  process.env.RATE_LIMIT_AI_MAX ??= "100000";
}
