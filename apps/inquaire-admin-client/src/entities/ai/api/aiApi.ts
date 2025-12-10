/**
 * AI Entity - API
 * FSD Entities Layer
 */

import type {
  AnalysisResult,
  AnalyzeInquiryRequest,
  ClassifyRequest,
  ClassifyResponse,
  GenerateReplyRequest,
  GenerateReplyResponse,
} from '../model/types';

import { apiClient } from '@/shared/api/client';

/**
 * AI API
 */
export const aiApi = {
  /**
   * 문의 메시지 분석
   */
  analyze: async (data: AnalyzeInquiryRequest): Promise<AnalysisResult> => {
    return apiClient.post<AnalysisResult>('/ai/analyze', data);
  },

  /**
   * AI 답변 생성
   */
  generateReply: async (data: GenerateReplyRequest): Promise<GenerateReplyResponse> => {
    return apiClient.post<GenerateReplyResponse>('/ai/generate-reply', data);
  },

  /**
   * 문의 분류
   */
  classify: async (data: ClassifyRequest): Promise<ClassifyResponse> => {
    return apiClient.post<ClassifyResponse>('/ai/classify', data);
  },
};
