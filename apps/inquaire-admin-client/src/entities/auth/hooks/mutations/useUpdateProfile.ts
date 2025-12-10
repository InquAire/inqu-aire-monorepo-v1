/**
 * Auth Entity - Mutation Hook: useUpdateProfile
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { authApi } from '../../api/authApi';
import { authKeys } from '../../model/constants';
import type { UpdateProfileRequest } from '../../model/types';

/**
 * 프로필 업데이트 Hook
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => authApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.profile() });
    },
  });
}
