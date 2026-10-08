import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false });

const defaults = { attempts: 3, backoff: { type: 'exponential' as const, delay: 5000 }, removeOnComplete: 100, removeOnFail: 500 };

export const aiExtractionQueue = new Queue('ai-extraction', { connection: connection.duplicate(), defaultJobOptions: defaults });
export const aiReadinessQueue = new Queue('ai-readiness', { connection: connection.duplicate(), defaultJobOptions: defaults });
export const aiScopeQueue = new Queue('ai-scope', { connection: connection.duplicate(), defaultJobOptions: defaults });
export const aiChangeQueue = new Queue('ai-change-analysis', { connection: connection.duplicate(), defaultJobOptions: defaults });
export const remindersQueue = new Queue('reminders', { connection: connection.duplicate(), defaultJobOptions: { ...defaults, attempts: 2 } });
