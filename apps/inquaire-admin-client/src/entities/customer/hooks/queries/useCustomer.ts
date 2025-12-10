/**
 * Customer Entity - Query Hook: useCustomer
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { customerApi } from '../../api/customerApi';
import { customerKeys } from '../../model/constants';

/**
 * 고객 상세 조회 Hook
 */
export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customerApi.get(id),
    enabled: !!id,
  });
}
