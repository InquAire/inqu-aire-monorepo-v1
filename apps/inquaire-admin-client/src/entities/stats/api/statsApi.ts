/**
 * Stats Entity - API
 * FSD Entities Layer
 */

import type { GetDailyStatsParams, StatsResponse } from '../model/types';

import { apiClient } from '@/shared/api/client';

/**
 * 통계 API
 */
export const statsApi = {
  /**
   * 일별 통계 조회
   */
  getDailyStats: async (params: GetDailyStatsParams): Promise<StatsResponse> => {
    return apiClient.get<StatsResponse>('/stats/daily', { params });
  },
};
