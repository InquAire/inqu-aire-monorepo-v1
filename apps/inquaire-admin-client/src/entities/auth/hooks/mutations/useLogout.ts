/**
 * Auth Entity - Mutation Hook: useLogout
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { authApi } from '../../api/authApi';

/**
 * 로그아웃 Hook
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) throw new Error('No refresh token found');
      return authApi.logout(refreshToken);
    },
    onSuccess: () => {
      // 모든 캐시 초기화
      queryClient.clear();
    },
  });
}
