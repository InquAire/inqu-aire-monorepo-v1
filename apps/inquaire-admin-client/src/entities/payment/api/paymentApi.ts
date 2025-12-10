/**
 * Payment Entity - API
 * FSD Entities Layer
 */

import type {
  CreatePaymentRequest,
  Payment,
  PaymentStats,
  QueryPaymentParams,
  UpdatePaymentRequest,
} from '../model/types';

import { apiClient } from '@/shared/api/client';
import type { PaginatedResponse } from '@/shared/api/types';

/**
 * 결제 API
 */
export const paymentApi = {
  /**
   * 결제 목록 조회
   */
  list: async (params?: QueryPaymentParams): Promise<PaginatedResponse<Payment>> => {
    return apiClient.get<PaginatedResponse<Payment>>('/payments', { params });
  },

  /**
   * 결제 통계 조회
   */
  getStats: async (): Promise<PaymentStats> => {
    return apiClient.get<PaymentStats>('/payments/stats');
  },

  /**
   * 결제 상세 조회
   */
  get: async (id: string): Promise<Payment> => {
    return apiClient.get<Payment>(`/payments/${id}`);
  },

  /**
   * 결제 생성
   */
  create: async (data: CreatePaymentRequest): Promise<Payment> => {
    return apiClient.post<Payment>('/payments', data);
  },

  /**
   * 결제 업데이트
   */
  update: async (id: string, data: UpdatePaymentRequest): Promise<Payment> => {
    return apiClient.patch<Payment>(`/payments/${id}`, data);
  },

  /**
   * 결제 확인 (PG사 연동)
   */
  confirm: async (id: string, paymentKey: string): Promise<Payment> => {
    return apiClient.post<Payment>(`/payments/${id}/confirm`, { payment_key: paymentKey });
  },

  /**
   * 결제 이력 조회 (business_id 필터로 목록 조회)
   */
  getHistory: async (businessId: string): Promise<PaginatedResponse<Payment>> => {
    return apiClient.get<PaginatedResponse<Payment>>('/payments', {
      params: { business_id: businessId },
    });
  },
};
