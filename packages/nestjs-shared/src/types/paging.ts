export type OrderDir = 'asc' | 'desc';

export interface CursorPaging {
  cursor?: string;
  limit?: number;
  orderBy?: { field: string; dir: OrderDir };
}

export interface Paginated<T> {
  items: T[];
  nextCursor?: string | null;
}

export interface CursorPageDto<T> {
  items: T[];
  nextCursor?: string | null;
  totalCount?: number; // 필요 시
}

// Page-based pagination (admin UI 등)
export interface PagePaging {
  page?: number;
  limit?: number;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
