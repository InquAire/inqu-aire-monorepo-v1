/**
 * Customer Entity - Query Hook: useCustomers
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { customerApi } from '../../api/customerApi';
import { customerKeys } from '../../model/constants';
import type { QueryCustomerParams } from '../../model/types';

/**
 * 고객 목록 조회 Hook
 */
export function useCustomers(params?: QueryCustomerParams) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => customerApi.list(params),
  });
}
