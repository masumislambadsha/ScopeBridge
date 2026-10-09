import { execSync } from "child_process";
import { Client } from "pg";
import { TEST_DATABASE_URL, testEnv } from "./env";

// Runs once in a separate process: create test DB + deploy migrations.
export default async function globalSetup() {
  testEnv();
  const url = new URL(TEST_DATABASE_URL);
  const dbName = url.pathname.replace(/^\//, "");
  url.pathname = "/postgres";
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  try {
    const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (exists.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[tests] created database ${dbName}`);
    }
  } finally {
    await admin.end();
  }
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });
  return async () => {};
}
