/**
 * Auth Entity - Mutation Hook: useSignup
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { authApi } from '../../api/authApi';
import { authKeys } from '../../model/constants';
import type { SignupRequest } from '../../model/types';

/**
 * 회원가입 Hook
 */
export function useSignup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignupRequest) => authApi.signup(data),
    onSuccess: () => {
      // 회원가입 성공 후 프로필 다시 가져오기
      queryClient.invalidateQueries({ queryKey: authKeys.profile() });
    },
  });
}
