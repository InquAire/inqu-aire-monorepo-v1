import { PageResult } from '../types/paging';

export function buildPage<T>(
  items: T[],
  page: number,
  limit: number,
  total: number
): PageResult<T> {
  const safeLimit = Math.max(limit || 1, 1);
  const totalPages = Math.ceil(total / safeLimit) || 1;
  const safePage = Math.max(page || 1, 1);
  return { items, page: safePage, limit: safeLimit, total, totalPages };
}
