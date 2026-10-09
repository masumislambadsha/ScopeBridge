import { env } from "../config/env";

type Level = "debug" | "info" | "warn" | "error";

function log(level: Level, msg: string, meta?: unknown) {
  const line = env.isProd
    ? JSON.stringify({ level, msg, ...(meta !== undefined ? { meta } : {}), time: new Date().toISOString() })
    : `[${level}] ${msg}${meta !== undefined ? ` ${JSON.stringify(meta)}` : ""}`;
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, meta?: unknown) => {
    if (!env.isProd) log("debug", msg, meta);
  },
  info: (msg: string, meta?: unknown) => log("info", msg, meta),
  warn: (msg: string, meta?: unknown) => log("warn", msg, meta),
  error: (msg: string, meta?: unknown) => log("error", msg, meta),
};
