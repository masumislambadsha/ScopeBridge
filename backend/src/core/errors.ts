import { ZodError } from "zod";
import { AppError, ErrorCode } from "./http";

/**
 * Map known error shapes to AppError. Anything else becomes INTERNAL
 * with no internal details (spec §3.2). Fixes §2.2 D01 alongside asyncHandler.
 */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof ZodError) {
    return new AppError(
      "VALIDATION_ERROR",
      "Invalid request",
      err.errors.map((e) => ({ path: e.path.join("."), message: e.message }))
    );
  }

  const anyErr = err as { code?: string; statusCode?: number; status?: number; type?: string; name?: string };
  const code = anyErr?.code ?? "";

  // Prisma: P2002 unique conflict → 409, P2025 not found → 404, P2003 FK → 400.
  if (code === "P2002") {
    const target = ((anyErr as { meta?: { target?: string[] } }).meta?.target ?? []).join(", ");
    return new AppError("CONFLICT", target ? `Already exists: ${target}` : "Resource already exists");
  }
  if (code === "P2025") return new AppError("NOT_FOUND", "Resource not found");
  if (code === "P2003") return new AppError("VALIDATION_ERROR", "Invalid reference");

  // Multer: file too large → 413, other upload errors → 400.
  if (anyErr?.name === "MulterError" || code === "LIMIT_FILE_SIZE") {
    if (code === "LIMIT_FILE_SIZE") return new AppError("FILE_TOO_LARGE", "File exceeds the 10MB limit");
    return new AppError("VALIDATION_ERROR", "File upload rejected");
  }
  // Our own upload filter errors carry status 400 already.
  if (typeof anyErr?.status === "number" && anyErr.status >= 400 && anyErr.status < 500) {
    return new AppError(statusToCode(anyErr.status), (err as Error)?.message ?? "Request failed");
  }

  // Malformed JSON body.
  if (anyErr?.type === "entity.parse.failed" || (anyErr instanceof SyntaxError && "body" in (anyErr as object))) {
    return new AppError("VALIDATION_ERROR", "Malformed JSON body");
  }

  // JWT errors from any manual verify call sites.
  if (anyErr?.name === "JsonWebTokenError" || anyErr?.name === "TokenExpiredError") {
    return new AppError("UNAUTHENTICATED", "Invalid or expired token");
  }

  const status = typeof (anyErr as { statusCode?: unknown })?.statusCode === "number"
    ? ((anyErr as { statusCode?: number }).statusCode as number)
    : typeof (anyErr as { status?: unknown })?.status === "number"
      ? ((anyErr as { status?: number }).status as number)
      : 500;
  if (status >= 400 && status < 500) return new AppError(statusToCode(status), (err as Error)?.message ?? "Request failed");
  return new AppError("INTERNAL", "Internal server error");
}

function statusToCode(status: number): ErrorCode {
  switch (status) {
    case 400: return "VALIDATION_ERROR";
    case 401: return "UNAUTHENTICATED";
    case 403: return "FORBIDDEN";
    case 404: return "NOT_FOUND";
    case 409: return "CONFLICT";
    case 413: return "FILE_TOO_LARGE";
    case 429: return "RATE_LIMITED";
    default: return status >= 500 ? "INTERNAL" : "VALIDATION_ERROR";
  }
}
