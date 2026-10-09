import { Request, Response, NextFunction, RequestHandler } from "express";

export const ErrorCodes = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  FILE_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  INTERNAL: 500,
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

export interface ErrorDetail {
  path: string;
  message: string;
}

/** Application error with a spec §3.2 code, HTTP status and optional field details. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ErrorDetail[];
  readonly isOperational = true;

  constructor(code: ErrorCode, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = ErrorCodes[code];
    this.details = details;
  }
}

export const badRequest = (message: string, details?: ErrorDetail[]) =>
  new AppError("VALIDATION_ERROR", message, details);
export const unauthenticated = (message = "Authentication required") =>
  new AppError("UNAUTHENTICATED", message);
export const forbidden = (message = "Insufficient permission") =>
  new AppError("FORBIDDEN", message);
export const notFound = (message = "Resource not found") =>
  new AppError("NOT_FOUND", message);
export const conflict = (message: string) => new AppError("CONFLICT", message);

/** Success envelope (§3.2). */
export function okBody<T>(data: T, meta?: { page: number; limit: number; total: number; totalPages: number }) {
  return meta ? { success: true as const, data, meta } : { success: true as const, data };
}

/** Error envelope (§3.2). */
export function failBody(code: ErrorCode, message: string, details?: ErrorDetail[]) {
  return { success: false as const, error: { code, message, ...(details ? { details } : {}) } };
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown;

/**
 * Wrap async route handlers so rejections reach the central error handler.
 * Required on Express 4 (no automatic async error catching). Fixes §2.2 D01.
 */
export function asyncHandler(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** Alias used in route files: `r.post('/x', ah(C.handler))`. */
export const ah = asyncHandler;

/** Wrap async *middleware* (not just handlers) so rejections reach the error handler. */
export function amw(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Dynamic import that resolves to null when the package is not installed.
 * Used for optional heavy deps (nodemailer, mammoth, unpdf) declared in
 * package.json — code runs with or without them (graceful fallbacks).
 */
export async function optionalImport(name: string): Promise<unknown> {
  try {
    return await import(name);
  } catch {
    return null;
  }
}
