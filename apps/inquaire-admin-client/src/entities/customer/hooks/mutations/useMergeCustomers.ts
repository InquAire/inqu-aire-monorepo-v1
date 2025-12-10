/**
 * Customer Entity - Mutation Hook: useMergeCustomers
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { customerApi } from '../../api/customerApi';
import { customerKeys } from '../../model/constants';

/**
 * 고객 병합 Hook
 */
export function useMergeCustomers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: string; targetId: string }) =>
      customerApi.merge(sourceId, targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}
