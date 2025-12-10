/**
 * Auth Entity - Query Hook: useProfile
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { authApi } from '../../api/authApi';
import { authKeys } from '../../model/constants';

import { API } from '@/shared/config/api-config';

/**
 * 프로필 조회 Hook
 */
export function useProfile() {
  return useQuery({
    queryKey: authKeys.profile(),
    queryFn: () => authApi.getProfile(),
    retry: false,
    staleTime: API.PROFILE_CACHE_TIME,
  });
}
