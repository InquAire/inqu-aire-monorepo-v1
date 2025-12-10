/**
 * Customer Entity - Mutation Hook: useDeleteCustomer
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { customerApi } from '../../api/customerApi';
import { customerKeys } from '../../model/constants';

/**
 * 고객 삭제 Hook
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customerApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}
