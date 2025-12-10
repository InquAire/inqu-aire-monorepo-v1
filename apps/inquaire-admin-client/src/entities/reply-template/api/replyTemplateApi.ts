/**
 * Reply Template Entity - API
 * FSD Entities Layer
 */

import type {
  CreateReplyTemplateRequest,
  QueryReplyTemplateParams,
  ReplyTemplate,
  UpdateReplyTemplateRequest,
} from '../model/types';

import { apiClient } from '@/shared/api/client';
import type { PaginatedResponse } from '@/shared/api/types';

/**
 * 답변 템플릿 API
 */
export const replyTemplateApi = {
  /**
   * 답변 템플릿 목록 조회
   */
  list: async (params?: QueryReplyTemplateParams): Promise<PaginatedResponse<ReplyTemplate>> => {
    return apiClient.get<PaginatedResponse<ReplyTemplate>>('/reply-templates', { params });
  },

  /**
   * 답변 템플릿 상세 조회
   */
  get: async (id: string): Promise<ReplyTemplate> => {
    return apiClient.get<ReplyTemplate>(`/reply-templates/${id}`);
  },

  /**
   * 답변 템플릿 생성
   */
  create: async (data: CreateReplyTemplateRequest): Promise<ReplyTemplate> => {
    return apiClient.post<ReplyTemplate>('/reply-templates', data);
  },

  /**
   * 답변 템플릿 수정
   */
  update: async (id: string, data: UpdateReplyTemplateRequest): Promise<ReplyTemplate> => {
    return apiClient.patch<ReplyTemplate>(`/reply-templates/${id}`, data);
  },

  /**
   * 답변 템플릿 삭제
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/reply-templates/${id}`);
  },

  /**
   * 템플릿 사용 횟수 증가
   */
  incrementUsage: async (id: string): Promise<ReplyTemplate> => {
    return apiClient.post<ReplyTemplate>(`/reply-templates/${id}/increment-usage`);
  },
};

// Deprecated: 하위 호환성을 위한 개별 함수 exports
/** @deprecated Use replyTemplateApi.list instead */
export const getReplyTemplates = replyTemplateApi.list;
/** @deprecated Use replyTemplateApi.get instead */
export const getReplyTemplate = replyTemplateApi.get;
/** @deprecated Use replyTemplateApi.create instead */
export const createReplyTemplate = replyTemplateApi.create;
/** @deprecated Use replyTemplateApi.update instead */
export const updateReplyTemplate = replyTemplateApi.update;
/** @deprecated Use replyTemplateApi.delete instead */
export const deleteReplyTemplate = replyTemplateApi.delete;
/** @deprecated Use replyTemplateApi.incrementUsage instead */
export const incrementTemplateUsage = replyTemplateApi.incrementUsage;
