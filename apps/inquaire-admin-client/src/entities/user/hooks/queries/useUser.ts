/**
 * User Entity - Query Hook: useUser
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { userApi } from '../../api/userApi';
import { userKeys } from '../../model/constants';

/**
 * 사용자 상세 조회 Hook
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userApi.get(id),
    enabled: !!id,
  });
}
