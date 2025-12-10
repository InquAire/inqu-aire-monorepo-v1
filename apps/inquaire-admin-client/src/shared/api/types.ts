/**
 * Shared API Types
 * Common types used across all API calls
 */

// ============================================
// Pagination Types
// ============================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ============================================
// API Envelope Types (for interceptor)
// ============================================

export type ApiEnvelope<T = unknown> = ApiResponse<T> | ApiError;

// ============================================
// Query Types
// ============================================

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchParams {
  search?: string;
}

export type QueryParams = PaginationParams & SortParams & SearchParams;
