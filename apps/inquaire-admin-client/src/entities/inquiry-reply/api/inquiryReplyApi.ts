/**
 * Inquiry Reply Entity - API
 * FSD Entities Layer
 */

import type {
  CreateInquiryReplyRequest,
  InquiryReply,
  QueryInquiryReplyParams,
  UpdateInquiryReplyRequest,
} from '../model/types';

import { apiClient } from '@/shared/api/client';
import type { PaginatedResponse } from '@/shared/api/types';

/**
 * 답변 API
 */
export const inquiryReplyApi = {
  /**
   * 답변 목록 조회
   */
  list: async (params?: QueryInquiryReplyParams): Promise<PaginatedResponse<InquiryReply>> => {
    return apiClient.get<PaginatedResponse<InquiryReply>>('/inquiry-replies', { params });
  },

  /**
   * 특정 문의에 대한 답변 이력 조회
   */
  listByInquiryId: async (inquiryId: string): Promise<PaginatedResponse<InquiryReply>> => {
    return apiClient.get<PaginatedResponse<InquiryReply>>(
      `/inquiry-replies/by-inquiry/${inquiryId}`
    );
  },

  /**
   * 답변 상세 조회
   */
  get: async (id: string): Promise<InquiryReply> => {
    return apiClient.get<InquiryReply>(`/inquiry-replies/${id}`);
  },

  /**
   * 답변 생성
   */
  create: async (data: CreateInquiryReplyRequest): Promise<InquiryReply> => {
    return apiClient.post<InquiryReply>('/inquiry-replies', data);
  },

  /**
   * 답변 업데이트
   */
  update: async (id: string, data: UpdateInquiryReplyRequest): Promise<InquiryReply> => {
    return apiClient.patch<InquiryReply>(`/inquiry-replies/${id}`, data);
  },

  /**
   * 답변 삭제
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/inquiry-replies/${id}`);
  },

  /**
   * 답변 재시도
   */
  retry: async (id: string): Promise<InquiryReply> => {
    return apiClient.post<InquiryReply>(`/inquiry-replies/${id}/retry`);
  },

  /**
   * 답변 전송 완료 처리
   */
  markAsSent: async (id: string): Promise<InquiryReply> => {
    return apiClient.post<InquiryReply>(`/inquiry-replies/${id}/mark-sent`);
  },

  /**
   * 답변 전송 실패 처리
   */
  markAsFailed: async (id: string, reason: string): Promise<InquiryReply> => {
    return apiClient.post<InquiryReply>(`/inquiry-replies/${id}/mark-failed`, { reason });
  },
};

/**
 * @deprecated Use inquiryReplyApi.listByInquiryId instead
 */
export async function getInquiryRepliesByInquiryId(
  inquiryId: string
): Promise<PaginatedResponse<InquiryReply>> {
  return inquiryReplyApi.listByInquiryId(inquiryId);
}
