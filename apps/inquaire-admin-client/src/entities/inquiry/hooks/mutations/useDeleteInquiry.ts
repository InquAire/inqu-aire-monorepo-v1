/**
 * Inquiry Entity - Mutation Hook: useDeleteInquiry
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { inquiryApi } from '../../api/inquiryApi';
import { inquiryKeys } from '../../model/constants';

/**
 * 문의 삭제 Hook
 */
export function useDeleteInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => inquiryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.lists() });
    },
  });
}
