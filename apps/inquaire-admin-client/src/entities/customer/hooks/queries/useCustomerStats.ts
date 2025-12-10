/**
 * Customer Entity - Query Hook: useCustomerStats
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { customerApi } from '../../api/customerApi';
import { customerKeys } from '../../model/constants';

/**
 * 고객 통계 조회 Hook
 */
export function useCustomerStats(businessId: string) {
  return useQuery({
    queryKey: customerKeys.stats(businessId),
    queryFn: () => customerApi.getStats(businessId),
    enabled: !!businessId,
  });
}
