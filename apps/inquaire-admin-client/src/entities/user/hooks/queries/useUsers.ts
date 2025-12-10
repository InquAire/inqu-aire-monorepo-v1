/**
 * User Entity - Query Hook: useUsers
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { userApi } from '../../api/userApi';
import { userKeys } from '../../model/constants';
import type { QueryUserRequest } from '../../model/types';

/**
 * 사용자 목록 조회 Hook
 */
export function useUsers(params: QueryUserRequest = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => userApi.list(params),
  });
}
