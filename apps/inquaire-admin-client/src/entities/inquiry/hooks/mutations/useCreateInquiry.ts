/**
 * Inquiry Entity - Mutation Hook: useCreateInquiry
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { inquiryApi } from '../../api/inquiryApi';
import { inquiryKeys } from '../../model/constants';
import type { CreateInquiryRequest } from '../../model/types';

/**
 * 문의 생성 Hook
 */
export function useCreateInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInquiryRequest) => inquiryApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.lists() });
    },
  });
}
