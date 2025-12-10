/**
 * Inquiry Entity - API
 * FSD Entities Layer
 */

import type {
  CreateInquiryRequest,
  GetStatsQueryParams,
  Inquiry,
  InquiryStats,
  QueryInquiryParams,
  UpdateInquiryRequest,
} from '../model/types';

import { apiClient } from '@/shared/api/client';
import type { PaginatedResponse } from '@/shared/api/types';

/**
 * 문의 API
 */
export const inquiryApi = {
  /**
   * 문의 목록 조회
   */
  list: async (params?: QueryInquiryParams): Promise<PaginatedResponse<Inquiry>> => {
    return apiClient.get<PaginatedResponse<Inquiry>>('/inquiries', { params });
  },

  /**
   * 문의 상세 조회
   */
  get: async (id: string): Promise<Inquiry> => {
    return apiClient.get<Inquiry>(`/inquiries/${id}`);
  },

  /**
   * 문의 생성
   */
  create: async (data: CreateInquiryRequest): Promise<Inquiry> => {
    return apiClient.post<Inquiry>('/inquiries', data);
  },

  /**
   * 문의 업데이트
   */
  update: async (id: string, data: UpdateInquiryRequest): Promise<Inquiry> => {
    return apiClient.patch<Inquiry>(`/inquiries/${id}`, data);
  },

  /**
   * 문의 삭제
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/inquiries/${id}`);
  },

  /**
   * 문의 통계 조회
   */
  getStats: async (params: GetStatsQueryParams): Promise<InquiryStats> => {
    return apiClient.get<InquiryStats>('/inquiries/stats', { params });
  },

  /**
   * AI 분석 실행
   */
  analyzeWithAi: async (id: string): Promise<Inquiry> => {
    return apiClient.post<Inquiry>(`/inquiries/${id}/analyze`);
  },
};
