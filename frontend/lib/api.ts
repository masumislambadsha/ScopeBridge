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
export function setAccessToken(t: string | null) {
  accessToken = t;
}
export function getAccessToken() {
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
    // Refresh once (first-party cookie) and retry.
    const r = await raw("/api/auth/refresh", { method: "POST" });
    if (r.ok) {
      const j = await r.json().catch(() => null);
      const next = j?.data?.accessToken as string | undefined;
      if (next) {
        accessToken = next;
        return req(path, opts, true);
      }
    }
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    const e = json?.error ?? {};
    throw new ApiError(res.status, e.code ?? "INTERNAL", e.message ?? `Request failed (${res.status})`, e.details);
  }
  return json;
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
