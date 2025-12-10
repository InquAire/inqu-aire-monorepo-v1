/**
 * Business Entity - Query Hook: useBusiness
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { businessApi } from '../../api/businessApi';
import { businessKeys } from '../../model/constants';

/**
 * 사업체 상세 조회 Hook
 */
export function useBusiness(id: string, userId?: string) {
  return useQuery({
    queryKey: businessKeys.detail(id),
    queryFn: () => businessApi.get(id, userId),
    enabled: !!id,
  });
}
