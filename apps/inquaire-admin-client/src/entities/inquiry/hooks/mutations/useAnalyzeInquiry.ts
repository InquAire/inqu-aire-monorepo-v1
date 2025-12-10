/**
 * Inquiry Entity - Mutation Hook: useAnalyzeInquiry
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { inquiryApi } from '../../api/inquiryApi';
import { inquiryKeys } from '../../model/constants';

/**
 * AI 분석 실행 Hook
 */
export function useAnalyzeInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => inquiryApi.analyzeWithAi(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: inquiryKeys.detail(id) });
    },
  });
}
