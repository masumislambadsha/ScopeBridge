export function paginate(query: any) {
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const rawLimit = parseInt(query.limit ?? '20', 10) || 20;
  const limit = Math.min(100, Math.max(1, rawLimit));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function paged<T>(data: T[], total: number, page: number, limit: number) {
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
