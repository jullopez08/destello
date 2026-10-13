export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Runs a count and a skip/take query in parallel and wraps the result in the
// shared { data, page, limit, total, totalPages } shape used by every
// paginated list endpoint (see DoctorBlockService.findHistory, the first to
// establish it) — one place for the skip math and the response shape
// instead of re-deriving both at every call site.
export async function paginate<T>(
  count: () => Promise<number>,
  findMany: (skip: number, take: number) => Promise<T[]>,
  page: number,
  limit: number,
): Promise<PaginatedResult<T>> {
  const [total, data] = await Promise.all([count(), findMany((page - 1) * limit, limit)]);
  return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
}
