/**
 * Webhook Entity - API
 * FSD Entities Layer
 */

import type { QueryWebhookEventParams, WebhookEvent } from '../model/types';

import { apiClient } from '@/shared/api/client';
import type { PaginatedResponse } from '@/shared/api/types';

/**
 * 웹훅 이벤트 API
 */
export const webhookApi = {
  /**
   * 웹훅 이벤트 목록 조회
   */
  list: async (params?: QueryWebhookEventParams): Promise<PaginatedResponse<WebhookEvent>> => {
    return apiClient.get<PaginatedResponse<WebhookEvent>>('/webhook-events', { params });
  },

  /**
   * 웹훅 이벤트 통계
   */
  getStats: async () => {
    return apiClient.get('/webhook-events/stats');
  },

  /**
   * 웹훅 이벤트 상세 조회
   */
  get: async (id: string): Promise<WebhookEvent> => {
    return apiClient.get<WebhookEvent>(`/webhook-events/${id}`);
  },

  /**
   * 실패한 웹훅 재처리
   */
  retry: async (id: string): Promise<WebhookEvent> => {
    return apiClient.post<WebhookEvent>(`/webhook-events/${id}/retry`);
  },
};
