/**
 * AI Entity - Mutation Hook: useAnalyzeInquiry
 * FSD Entities Layer
 */

import { useMutation } from '@tanstack/react-query';

import { aiApi } from '../../api/aiApi';
import type { AnalyzeInquiryRequest } from '../../model/types';

/**
 * AI 분석 Hook
 */
export function useAnalyzeInquiry() {
  return useMutation({
    mutationFn: (data: AnalyzeInquiryRequest) => aiApi.analyze(data),
  });
}
