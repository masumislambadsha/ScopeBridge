/** Typed API client: unwraps { success, data, meta }, in-memory token, refresh-once on 401. */

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Array<{ path: string; message: string }>;
  constructor(status: number, code: string, message: string, details?: Array<{ path: string; message: string }>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let accessToken: string | null = null;
const MEM_KEY = "sb_at";

function readStored(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(MEM_KEY);
  } catch {
    return null;
  }
}

/** Access token lives in memory, mirrored to tab-scoped sessionStorage so full
 * page reloads don't force a refresh roundtrip (D-17). Cleared on logout and
 * on final 401. Never localStorage. */
export function setAccessToken(t: string | null) {
  accessToken = t;
  if (typeof window !== "undefined") {
    try {
      if (t) window.sessionStorage.setItem(MEM_KEY, t);
      else window.sessionStorage.removeItem(MEM_KEY);
    } catch {
      /* ignore */
    }
  }
}
export function getAccessToken() {
  if (!accessToken) accessToken = readStored();
  return accessToken;
}

/** Multipart uploads + sockets go direct (no Next.js proxy body limits, §3.3). */
export const DIRECT_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function raw(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = { ...((opts.headers ?? {}) as Record<string, string>) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (opts.body && !(opts.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(path.startsWith("http") ? path : `/api${path.replace(/^\/api/, "")}`, {
    ...opts,
    credentials: "include",
    headers,
  });
}

async function req<T>(path: string, opts: RequestInit = {}, retried = false): Promise<{ data: T; meta?: { page: number; limit: number; total: number; totalPages: number; unreadCount?: number } }> {
  const res = await raw(path, opts);
  if (res.status === 401 && !retried && !path.includes("/api/auth/")) {
    // Refresh once (first-party cookie) and retry. Single-flight so concurrent
    // 401s don't race the single-use refresh token.
    const next = await sharedRefresh();
    if (next) {
      accessToken = next;
      try {
        if (typeof window !== "undefined") window.sessionStorage.setItem(MEM_KEY, next);
      } catch {
        /* ignore */
      }
      return req(path, opts, true);
    }
    // Refresh failed: drop the dead token so we don't keep retrying with it.
    setAccessToken(null);
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    const e = json?.error ?? {};
    throw new ApiError(res.status, e.code ?? "INTERNAL", e.message ?? `Request failed (${res.status})`, e.details);
  }
  return json;
}

let refreshPromise: Promise<string | null> | null = null;

function sharedRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const r = await raw("/api/auth/refresh", { method: "POST" });
        if (!r.ok) return null;
        const j = await r.json().catch(() => null);
        return (j?.data?.accessToken as string | undefined) ?? null;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/** Restore the session on app load. Single-flight with request-triggered refreshes. */
export async function restoreSession(): Promise<string | null> {
  const next = await sharedRefresh();
  if (next) accessToken = next;
  return next;
}

export const api = {
  get: <T>(p: string) => req<T>(p),
  post: <T>(p: string, body?: unknown) =>
    req<T>(p, { method: "POST", body: body instanceof FormData || body === undefined ? (body as FormData | undefined) : JSON.stringify(body) }),
  patch: <T>(p: string, body?: unknown) => req<T>(p, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  del: <T>(p: string) => req<T>(p, { method: "DELETE" }),
  /** Direct (unproxied) calls for multipart uploads. */
  directPost: async <T>(p: string, form: FormData): Promise<{ data: T }> => {
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(`${DIRECT_API}${p}`, { method: "POST", headers, body: form });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      const e = json?.error ?? {};
      throw new ApiError(res.status, e.code ?? "INTERNAL", e.message ?? `Upload failed (${res.status})`, e.details);
    }
    return json;
  },
};

export function fieldErrors(err: unknown): Record<string, string> {
  if (err instanceof ApiError && err.details) {
    const out: Record<string, string> = {};
    for (const d of err.details) {
      const key = d.path.split(".").pop() ?? d.path;
      if (!out[key]) out[key] = d.message;
    }
    return out;
  }
  return {};
}
