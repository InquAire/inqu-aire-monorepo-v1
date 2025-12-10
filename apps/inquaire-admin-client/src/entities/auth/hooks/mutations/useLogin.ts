/**
 * Auth Entity - Mutation Hook: useLogin
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { authApi } from '../../api/authApi';
import { authKeys } from '../../model/constants';
import type { LoginRequest } from '../../model/types';

/**
 * 로그인 Hook
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: () => {
      // 로그인 후 프로필 다시 가져오기
      queryClient.invalidateQueries({ queryKey: authKeys.profile() });
    },
  });
}
