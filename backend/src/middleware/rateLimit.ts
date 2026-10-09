import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "../lib/redis";
import { env } from "../config/env";
import { failBody } from "../core/http";

function store(prefix: string) {
  return new RedisStore({
    prefix,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: (...args: string[]) => (redis as any).call(...args),
  });
}

function handler(_req: unknown, res: unknown, _next: unknown, options: { statusCode: number }) {
  (res as { status: (c: number) => { json: (b: unknown) => void } })
    .status(options.statusCode)
    .json(failBody("RATE_LIMITED", "Too many requests, please slow down"));
}

/** Global API limit (Generous; Redis-backed). */
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_API_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: store('rl-api:'),
  handler,
});

/** Stricter limit on auth routes (brute-force protection). */
export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: store('rl-auth:'),
  handler,
});

/** Separate limit on AI routes (per-workspace accounting arrives with AI modules in Phase 5). */
export const aiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_AI_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: store('rl-ai:'),
  handler,
});
