/**
 * User Entity - Query Hook: useUserStats
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { userApi } from '../../api/userApi';
import { userKeys } from '../../model/constants';

/**
 * 사용자 통계 조회 Hook
 */
export function useUserStats() {
  return useQuery({
    queryKey: userKeys.stats(),
    queryFn: () => userApi.getStats(),
  });
}
