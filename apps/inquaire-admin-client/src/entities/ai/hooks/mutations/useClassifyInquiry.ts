/**
 * AI Entity - Mutation Hook: useClassifyInquiry
 * FSD Entities Layer
 */

import { useMutation } from '@tanstack/react-query';

import { aiApi } from '../../api/aiApi';
import type { ClassifyRequest } from '../../model/types';

/**
 * 문의 분류 Hook
 */
export function useClassifyInquiry() {
  return useMutation({
    mutationFn: (data: ClassifyRequest) => aiApi.classify(data),
  });
}
