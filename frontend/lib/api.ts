const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sb_access');
}

async function req(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...opts,
    credentials: 'include',
    headers: {
      ...(opts.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (res.status === 401 && typeof window !== 'undefined' && !path.includes('/auth/')) {
    // try refresh once
    const r = await fetch(`${API}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (r.ok) {
      const j = await r.json();
      if (j?.data?.accessToken) {
        localStorage.setItem('sb_access', j.data.accessToken);
        return req(path, opts);
      }
    }
  }
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw new Error(json?.message ?? `Request failed (${res.status})`);
  return json;
}

export const api = {
  get: (p: string) => req(p),
  post: (p: string, body?: any) => req(p, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  patch: (p: string, body?: any) => req(p, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: (p: string) => req(p, { method: 'DELETE' }),
};
