/**
 * Customer Entity - API
 * FSD Entities Layer
 */

import type {
  CreateCustomerRequest,
  Customer,
  CustomerStats,
  QueryCustomerParams,
  UpdateCustomerRequest,
} from '../model/types';

import { apiClient } from '@/shared/api/client';
import type { PaginatedResponse } from '@/shared/api/types';

/**
 * 고객 API
 */
export const customerApi = {
  /**
   * 고객 목록 조회
   */
  list: async (params?: QueryCustomerParams): Promise<PaginatedResponse<Customer>> => {
    return apiClient.get<PaginatedResponse<Customer>>('/customers', { params });
  },

  /**
   * 고객 상세 조회
   */
  get: async (id: string): Promise<Customer> => {
    return apiClient.get<Customer>(`/customers/${id}`);
  },

  /**
   * 고객 생성
   */
  create: async (data: CreateCustomerRequest): Promise<Customer> => {
    return apiClient.post<Customer>('/customers', data);
  },

  /**
   * 고객 업데이트
   */
  update: async (id: string, data: UpdateCustomerRequest): Promise<Customer> => {
    return apiClient.patch<Customer>(`/customers/${id}`, data);
  },

  /**
   * 고객 삭제
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/customers/${id}`);
  },

  /**
   * 고객 통계 조회
   */
  getStats: async (businessId: string): Promise<CustomerStats> => {
    return apiClient.get<CustomerStats>('/customers/stats', {
      params: { business_id: businessId },
    });
  },

  /**
   * 고객 병합 (중복 제거)
   */
  merge: async (sourceId: string, targetId: string): Promise<Customer> => {
    return apiClient.post<Customer>(`/customers/${sourceId}/merge/${targetId}`);
  },
};
