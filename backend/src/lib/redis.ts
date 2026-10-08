import IORedis from 'ioredis';
import { env } from '../config/env';

const globalForRedis = globalThis as unknown as { redis?: IORedis };

function createClient() {
  const client = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });
  client.on('error', (e) => console.error('[redis] error', e.message));
  return client;
}

export const redis = globalForRedis.redis ?? createClient();
if (process.env.NODE_ENV !== 'production') (globalForRedis as any).redis = redis;

export const REFRESH_PREFIX = 'refresh:';
export function refreshKey(jti: string) { return `${REFRESH_PREFIX}${jti}`; }
