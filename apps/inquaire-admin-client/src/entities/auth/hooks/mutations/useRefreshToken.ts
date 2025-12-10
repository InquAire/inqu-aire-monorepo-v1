/**
 * Auth Entity - Mutation Hook: useRefreshToken
 * FSD Entities Layer
 */

import { useMutation } from '@tanstack/react-query';

import { authApi } from '../../api/authApi';
import type { RefreshTokenRequest } from '../../model/types';

/**
 * 토큰 갱신 Hook
 */
export function useRefreshToken() {
  return useMutation({
    mutationFn: (data: RefreshTokenRequest) => authApi.refreshToken(data),
  });
}
