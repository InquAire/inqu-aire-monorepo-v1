/**
 * Error Log Entity - API
 * FSD Entities Layer
 */

import type {
  ErrorLog,
  ErrorLogStats,
  QueryErrorLogParams,
  ResolveErrorLogRequest,
} from '../model/types';

import { apiClient } from '@/shared/api/client';
import type { PaginatedResponse } from '@/shared/api/types';

/**
 * 에러 로그 API
 */
export const errorLogApi = {
  /**
   * 에러 로그 목록 조회
   */
  list: async (params?: QueryErrorLogParams): Promise<PaginatedResponse<ErrorLog>> => {
    return apiClient.get<PaginatedResponse<ErrorLog>>('/error-logs', { params });
  },

  /**
   * 에러 로그 통계 조회
   */
  getStats: async (): Promise<ErrorLogStats> => {
    return apiClient.get<ErrorLogStats>('/error-logs/stats');
  },

  /**
   * 에러 로그 상세 조회
   */
  get: async (id: string): Promise<ErrorLog> => {
    return apiClient.get<ErrorLog>(`/error-logs/${id}`);
  },

  /**
   * 에러 로그 해결 처리
   */
  resolve: async (id: string, data: ResolveErrorLogRequest): Promise<ErrorLog> => {
    return apiClient.patch<ErrorLog>(`/error-logs/${id}/resolve`, data);
  },
};
