/**
 * Business Entity - Mutation Hook: useDeleteBusiness
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { businessApi } from '../../api/businessApi';
import { businessKeys } from '../../model/constants';

/**
 * 사업체 삭제 Hook
 */
export function useDeleteBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId?: string }) => businessApi.delete(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessKeys.lists() });
    },
  });
}
