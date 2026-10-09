export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function paginate(query: unknown) {
  const q = (query ?? {}) as Record<string, unknown>;
  const page = Math.max(1, parseInt(String(q.page ?? "1"), 10) || 1);
  const rawLimit = parseInt(String(q.limit ?? "20"), 10) || 20;
  const limit = Math.min(100, Math.max(1, rawLimit));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

/** Spec §3.2 list shape: `{ success: true, data, meta }` (built via okBody at the call site). */
export function paged<T>(data: T[], total: number, page: number, limit: number): { data: T[]; meta: PageMeta } {
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
