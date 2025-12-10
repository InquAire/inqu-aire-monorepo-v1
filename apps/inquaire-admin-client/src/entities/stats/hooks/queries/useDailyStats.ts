/**
 * Stats Entity - Query Hook: useDailyStats
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { statsApi } from '../../api/statsApi';
import { statsKeys } from '../../model/constants';
import type { GetDailyStatsParams } from '../../model/types';

/**
 * 일별 통계 조회 Hook
 */
export function useDailyStats(params: GetDailyStatsParams) {
  return useQuery({
    queryKey: statsKeys.daily(params),
    queryFn: () => statsApi.getDailyStats(params),
    enabled: !!params.business_id,
  });
}
