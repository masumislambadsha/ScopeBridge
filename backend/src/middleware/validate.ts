import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { badRequest } from "../core/http";

type Source = "body" | "query" | "params";

/**
 * Validate one request source against a Zod schema. On failure throws a
 * VALIDATION_ERROR (with per-field details) to the central handler.
 * Use on every route for body, query and params (§3.2).
 */
export const validate = (schema: ZodSchema, source: Source = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      throw badRequest(
        "Invalid request",
        result.error.errors.map((e) => ({ path: e.path.join("."), message: e.message }))
      );
    }
    (req as unknown as Record<string, unknown>)[source] = result.data;
    next();
  };

/** Validate several sources at once: `validateAll({ body, query, params })`. */
export const validateAll = (schemas: Partial<Record<Source, ZodSchema>>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    for (const [source, schema] of Object.entries(schemas)) {
      if (!schema) continue;
      const result = schema.safeParse(req[source as Source]);
      if (!result.success) {
        throw badRequest(
          "Invalid request",
          result.error.errors.map((e) => ({
            path: `${source}.${e.path.join(".")}`,
            message: e.message,
          }))
        );
      }
      (req as unknown as Record<string, unknown>)[source] = result.data;
    }
    next();
  };
