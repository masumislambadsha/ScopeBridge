import IORedis from "ioredis";
import { env } from "../config/env";

const globalForRedis = globalThis as unknown as { redis?: IORedis };

function createClient() {
  const client = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  });
  client.on("error", (e) => console.error("[redis] error", e.message));
  return client;
}

function isUsable(c: unknown): c is IORedis {
  const s = (c as { status?: unknown } | null | undefined)?.status;
  return s === "ready" || s === "connect" || s === "connecting" || s === "reconnecting" || s === "wait";
}

/**
 * Shared client. Replaces a dead cached instance instead of reusing it —
 * test runners re-evaluate modules per file while globalThis persists,
 * and teardown disconnects the old client.
 */
function getShared(): IORedis {
  const cached: unknown = globalForRedis.redis;
  if (isUsable(cached)) return cached;
  const dead = cached as { disconnect?: () => void } | null | undefined;
  try {
    dead?.disconnect?.();
  } catch {
    /* already dead */
  }
  const client = createClient();
  if (process.env.NODE_ENV !== "production") globalForRedis.redis = client;
  return client;
}

export const redis: IORedis = new Proxy({} as IORedis, {
  get: (_t, prop, receiver) => {
    const client = getShared();
    const value = Reflect.get(client as unknown as object, prop as string, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
  set: (_t, prop, value) => {
    Reflect.set(getShared() as unknown as object, prop as string, value);
    return true;
  },
});

export const REFRESH_PREFIX = "refresh:";
export function refreshKey(jti: string) {
  return `${REFRESH_PREFIX}${jti}`;
}
