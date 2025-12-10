/**
 * Business Entity - Mutation Hook: useUpdateBusiness
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { businessApi } from '../../api/businessApi';
import { businessKeys } from '../../model/constants';
import type { UpdateBusinessRequest } from '../../model/types';

/**
 * 사업체 업데이트 Hook
 */
export function useUpdateBusiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
      userId,
    }: {
      id: string;
      data: UpdateBusinessRequest;
      userId?: string;
    }) => businessApi.update(id, data, userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: businessKeys.lists() });
      queryClient.invalidateQueries({ queryKey: businessKeys.detail(variables.id) });
    },
  });
}
