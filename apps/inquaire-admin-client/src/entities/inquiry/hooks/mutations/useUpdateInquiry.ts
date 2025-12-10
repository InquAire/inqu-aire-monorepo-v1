/**
 * Inquiry Entity - Mutation Hook: useUpdateInquiry
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { inquiryApi } from '../../api/inquiryApi';
import { inquiryKeys } from '../../model/constants';
import type { UpdateInquiryRequest } from '../../model/types';

/**
 * 문의 업데이트 Hook
 */
export function useUpdateInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInquiryRequest }) =>
      inquiryApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inquiryKeys.detail(variables.id) });
    },
  });
}
