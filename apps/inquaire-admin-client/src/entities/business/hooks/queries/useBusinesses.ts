/**
 * Business Entity - Query Hook: useBusinesses
 * FSD Entities Layer
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { businessApi } from '../../api/businessApi';
import { businessKeys } from '../../model/constants';
import type { Business, BusinessListFilters } from '../../model/types';

/**
 * 사업체 목록 조회 Hook
 * @param organizationId 조직 ID (필수)
 * @param filters 추가 필터 옵션
 * @param options React Query 옵션
 */
export function useBusinesses(
  organizationId: string,
  filters?: Omit<BusinessListFilters, 'organizationId'>,
  options?: Omit<UseQueryOptions<Business[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Business[], Error>({
    queryKey: businessKeys.list(filters?.userId, organizationId),
    queryFn: () => businessApi.list(organizationId, filters),
    enabled: !!organizationId,
    ...options,
  });
}
