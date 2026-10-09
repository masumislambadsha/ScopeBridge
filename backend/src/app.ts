import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { okBody } from "./core/http";
import authRoutes from "./modules/auth/auth.routes";
import apiRoutes from "./modules/index";
import { apiLimiter } from "./middleware/rateLimit";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { buildDocument } from "./openapi/document";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";

export function buildApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(morgan(env.isProd ? "combined" : "dev"));
  app.use(cors({ origin: env.frontendOrigins, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json(okBody({ status: "ok", time: new Date().toISOString() }));
  });

  app.get("/ready", async (_req, res, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      await redis.ping();
      res.json(okBody({ status: "ready", time: new Date().toISOString() }));
    } catch (err) {
      next(err);
    }
  });

  let spec: Record<string, unknown> = { openapi: "3.0.0", info: { title: "ScopeBridge API", version: "1.0.0" }, paths: {} };
  try {
    spec = buildDocument() as unknown as Record<string, unknown>;
  } catch {
    // Registry builds fully once all modules load; fallback keeps /api-docs alive.
  }
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec as never));
  app.get("/api-docs.json", (_req, res) => {
    res.json(spec);
  });

  // NOTE: /api/ai/* is rate-limited by aiLimiter inside the ai router — skip the
  // general limiter there to avoid express-rate-limit double counting.
  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/ai/")) return next();
    return apiLimiter(req, res, next);
  });
  app.use("/api/auth", authRoutes);
  app.use("/api", apiRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
