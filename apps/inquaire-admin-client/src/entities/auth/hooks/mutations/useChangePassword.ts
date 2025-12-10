/**
 * Auth Entity - Mutation Hook: useChangePassword
 * FSD Entities Layer
 */

import { useMutation } from '@tanstack/react-query';

import { authApi } from '../../api/authApi';
import type { ChangePasswordRequest } from '../../model/types';

/**
 * 비밀번호 변경 Hook
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => authApi.changePassword(data),
  });
}
