import { Request, Response, NextFunction } from "express";
import { failBody } from "../core/http";
import { toAppError } from "../core/errors";
import { logger } from "../core/logger";
import { env } from "../config/env";

/** Central error handler → spec §3.2 envelope. Never leaks internals on 500. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const appErr = toAppError(err);
  if (appErr.status >= 500) {
    logger.error("unhandled error", env.isProd ? undefined : { err: String((err as Error)?.stack ?? err) });
  }
  res.status(appErr.status).json(failBody(appErr.code, appErr.message, appErr.details));
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json(failBody("NOT_FOUND", "Route not found"));
}
