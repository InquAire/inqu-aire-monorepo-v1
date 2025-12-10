/**
 * Subscription Entity - API
 * FSD Entities Layer
 */

import type {
  CreateSubscriptionRequest,
  QuerySubscriptionParams,
  Subscription,
  SubscriptionStats,
  SubscriptionUsage,
  UpdateSubscriptionRequest,
} from '../model/types';

import { apiClient } from '@/shared/api/client';
import type { PaginatedResponse } from '@/shared/api/types';

/**
 * 구독 API
 */
export const subscriptionApi = {
  /**
   * 구독 목록 조회
   */
  list: async (params?: QuerySubscriptionParams): Promise<PaginatedResponse<Subscription>> => {
    return apiClient.get<PaginatedResponse<Subscription>>('/subscriptions', { params });
  },

  /**
   * 구독 통계 조회
   */
  getStats: async (): Promise<SubscriptionStats> => {
    return apiClient.get<SubscriptionStats>('/subscriptions/stats');
  },

  /**
   * 비즈니스 구독 조회
   */
  getByBusiness: async (businessId: string): Promise<Subscription> => {
    return apiClient.get<Subscription>(`/subscriptions/business/${businessId}`);
  },

  /**
   * 구독 상세 조회
   */
  get: async (id: string): Promise<Subscription> => {
    return apiClient.get<Subscription>(`/subscriptions/${id}`);
  },

  /**
   * 구독 생성
   */
  create: async (data: CreateSubscriptionRequest): Promise<Subscription> => {
    return apiClient.post<Subscription>('/subscriptions', data);
  },

  /**
   * 구독 업데이트
   */
  update: async (id: string, data: UpdateSubscriptionRequest): Promise<Subscription> => {
    return apiClient.patch<Subscription>(`/subscriptions/${id}`, data);
  },

  /**
   * 구독 사용량 조회
   */
  getUsage: async (id: string): Promise<SubscriptionUsage> => {
    return apiClient.get<SubscriptionUsage>(`/subscriptions/${id}/usage`);
  },

  /**
   * 구독 취소
   */
  cancel: async (id: string): Promise<Subscription> => {
    return apiClient.post<Subscription>(`/subscriptions/${id}/cancel`);
  },

  /**
   * 청구 주기 리셋 (관리자 전용)
   */
  resetBillingCycle: async (id: string): Promise<Subscription> => {
    return apiClient.post<Subscription>(`/subscriptions/${id}/reset-billing-cycle`);
  },
};
