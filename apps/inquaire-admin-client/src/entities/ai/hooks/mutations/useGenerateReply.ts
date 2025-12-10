/**
 * AI Entity - Mutation Hook: useGenerateReply
 * FSD Entities Layer
 */

import { useMutation } from '@tanstack/react-query';

import { aiApi } from '../../api/aiApi';
import type { GenerateReplyRequest } from '../../model/types';

/**
 * AI 답변 생성 Hook
 */
export function useGenerateReply() {
  return useMutation({
    mutationFn: (data: GenerateReplyRequest) => aiApi.generateReply(data),
  });
}
