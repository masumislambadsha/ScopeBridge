import http from "http";
import { buildApp } from "./app";
import { env } from "./config/env";
import { logger } from "./core/logger";
import { initSocket } from "./lib/socket";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";

process.on("unhandledRejection", (reason) => {
  logger.error("unhandledRejection", { reason: String(reason) });
});

process.on("uncaughtException", (err) => {
  logger.error("uncaughtException", { err: String(err) });
  process.exit(1);
});

const app = buildApp();
const server = http.createServer(app);
initSocket(server);

server.listen(env.PORT, () => {
  logger.info(`[api] listening on :${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal: string) {
  logger.info(`[api] ${signal} received, shutting down`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      redis.disconnect();
    } catch (err) {
      logger.error("shutdown error", { err: String(err) });
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
