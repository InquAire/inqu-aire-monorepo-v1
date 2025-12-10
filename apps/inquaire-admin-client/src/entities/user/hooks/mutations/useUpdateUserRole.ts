/**
 * User Entity - Mutation Hook: useUpdateUserRole
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { userApi } from '../../api/userApi';
import { userKeys } from '../../model/constants';
import type { UpdateRoleRequest } from '../../model/types';

/**
 * 사용자 역할 변경 Hook (SUPER_ADMIN 전용)
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleRequest }) =>
      userApi.updateRole(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.stats() });
    },
  });
}
