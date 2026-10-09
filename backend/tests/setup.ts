import { afterAll } from "vitest";
import { testEnv } from "./env";

// Runs in each worker BEFORE test files import the app, so env validates.
testEnv();

afterAll(async () => {
  const [{ redis }, { prisma }, queues] = await Promise.all([
    import("../src/lib/redis"),
    import("../src/lib/prisma"),
    import("../src/queues/queues"),
  ]);
  await Promise.all(
    Object.values(queues)
      .filter((q) => q && typeof (q as { close?: unknown }).close === "function")
      .map(async (q) => {
        const queue = q as { obliterate?: (opts?: unknown) => Promise<void>; close: () => Promise<void> };
        try {
          await queue.obliterate?.({ force: true });
        } catch {
          // ignore — keeps Redis clean between suites when possible
        }
        await queue.close();
      }),
  );
  redis.disconnect();
  await prisma.$disconnect();
});
