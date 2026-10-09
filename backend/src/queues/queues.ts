import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";

function makeConnection() {
  return new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false });
}

const defaults = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};

/** All five AI features, keyed by AiRun.id (§3.6). */
export const aiQueue = new Queue("ai", { connection: makeConnection(), defaultJobOptions: defaults });
/** File text extraction. */
export const filesQueue = new Queue("files", { connection: makeConnection(), defaultJobOptions: defaults });
/** Outbound email. */
export const emailQueue = new Queue("email", { connection: makeConnection(), defaultJobOptions: defaults });
/** Hourly reminders (repeatable schedule registered at worker startup). */
export const remindersQueue = new Queue("reminders", {
  connection: makeConnection(),
  defaultJobOptions: { ...defaults },
});

export async function closeQueues() {
  await Promise.all([aiQueue.close(), filesQueue.close(), emailQueue.close(), remindersQueue.close()]);
}
