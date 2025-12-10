/**
 * Business Entity - Query Hook: useBusinessDashboard
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { businessApi } from '../../api/businessApi';
import { businessKeys } from '../../model/constants';

/**
 * 사업체 대시보드 조회 Hook
 */
export function useBusinessDashboard(id: string, userId?: string) {
  return useQuery({
    queryKey: businessKeys.dashboard(id),
    queryFn: () => businessApi.getDashboard(id, userId),
    enabled: !!id,
  });
}
