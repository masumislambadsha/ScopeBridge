import { Worker } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";
import { logger } from "../core/logger";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { aiQueue, filesQueue, emailQueue, remindersQueue, closeQueues } from "../queues/queues";
import { processExtract, processReadiness, processAcceptance, processScopeChange } from "./processors/ai.processor";
import { processFile } from "./processors/files.processor";
import { processEmail } from "./processors/email.processor";
import { processReminders } from "./processors/reminders.processor";

process.on("unhandledRejection", (reason) => {
  logger.error("[worker] unhandledRejection", { reason: String(reason) });
});

process.on("uncaughtException", (err) => {
  logger.error("[worker] uncaughtException", { err: String(err) });
  process.exit(1);
});

function connection() {
  return new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false });
}

const workers: Worker[] = [];

function start() {
  workers.push(
    new Worker("ai", async (job) => {
      if (job.name === "extract") return processExtract(job as never);
      if (job.name === "readiness") return processReadiness(job as never);
      if (job.name === "acceptance") return processAcceptance(job as never);
      if (job.name === "scope-change") return processScopeChange(job as never);
      throw new Error(`unknown ai job: ${job.name}`);
    }, { connection: connection() }),
    new Worker("files", (job) => processFile(job as never), { connection: connection() }),
    new Worker("email", (job) => processEmail(job as never), { connection: connection() }),
    new Worker("reminders", (job) => processReminders(job as never), { connection: connection() }),
  );
  for (const w of workers) {
    w.on("failed", (job, err) => logger.warn("[worker] job failed", { queue: w.name, jobId: job?.id, err: String(err) }));
  }
  logger.info("[worker] started (ai, files, email, reminders)");
}

async function registerSchedules() {
  // Hourly reminders (BullMQ ≥ 5.16 job schedulers).
  await remindersQueue.upsertJobScheduler("hourly-reminders", { every: 3_600_000 }, { name: "run", data: {} });
  logger.info("[worker] reminders schedule registered (hourly)");
}

async function shutdown(signal: string) {
  logger.info(`[worker] ${signal} received, shutting down`);
  try {
    await Promise.all(workers.map((w) => w.close()));
    await closeQueues();
    await prisma.$disconnect();
    redis.disconnect();
    // Close the scheduler-producer connections held by queue instances above.
    void aiQueue;
    void filesQueue;
    void emailQueue;
  } catch (err) {
    logger.error("[worker] shutdown error", { err: String(err) });
  }
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

start();
void registerSchedules().catch((e) => logger.error("[worker] scheduler failed", { err: String(e) }));
