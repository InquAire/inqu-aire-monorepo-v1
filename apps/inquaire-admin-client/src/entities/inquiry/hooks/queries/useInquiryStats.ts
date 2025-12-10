/**
 * Inquiry Entity - Query Hook: useInquiryStats
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { inquiryApi } from '../../api/inquiryApi';
import { inquiryKeys } from '../../model/constants';
import type { GetStatsQueryParams } from '../../model/types';

/**
 * 문의 통계 조회 Hook
 */
export function useInquiryStats(params: GetStatsQueryParams) {
  return useQuery({
    queryKey: inquiryKeys.stats(params),
    queryFn: () => inquiryApi.getStats(params),
    enabled: !!params.business_id,
  });
}
