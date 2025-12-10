/**
 * User Entity - Mutation Hook: useUpdateUser
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { userApi } from '../../api/userApi';
import { userKeys } from '../../model/constants';
import type { UpdateUserRequest } from '../../model/types';

/**
 * 사용자 업데이트 Hook
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) => userApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
