/**
 * User Entity - Mutation Hook: useCreateUser
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { userApi } from '../../api/userApi';
import { userKeys } from '../../model/constants';
import type { CreateUserRequest } from '../../model/types';

/**
 * 사용자 생성 Hook
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserRequest) => userApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.stats() });
    },
  });
}
