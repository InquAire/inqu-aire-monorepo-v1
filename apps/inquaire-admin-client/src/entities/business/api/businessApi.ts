/**
 * Business Entity - API
 * FSD Entities Layer
 */

import type {
  Business,
  BusinessDashboard,
  BusinessListFilters,
  CreateBusinessRequest,
  UpdateBusinessRequest,
} from '../model/types';

import { apiClient } from '@/shared/api/client';

/**
 * 사업체 API
 * organization_id 기반으로 사업체 관리
 */
export const businessApi = {
  /**
   * 사업체 목록 조회 (조직별)
   * @param organizationId 조직 ID (필수)
   * @param filters 추가 필터 옵션
   */
  list: async (
    organizationId: string,
    filters?: Omit<BusinessListFilters, 'organizationId'>
  ): Promise<Business[]> => {
    const params: Record<string, string | number> = {
      organization_id: organizationId,
    };

    if (filters?.userId) {
      params.user_id = filters.userId;
    }
    if (filters?.limit) {
      params.limit = filters.limit;
    }
    if (filters?.search) {
      params.search = filters.search;
    }

    return apiClient.get<Business[]>('/businesses', { params });
  },

  /**
   * 사업체 상세 조회
   */
  get: async (id: string, userId?: string): Promise<Business> => {
    const params = userId ? { user_id: userId } : {};
    return apiClient.get<Business>(`/businesses/${id}`, { params });
  },

  /**
   * 사업체 생성
   * @param data 생성 데이터 (organization_id 포함)
   * @param userId 사용자 ID (권한 확인용)
   */
  create: async (data: CreateBusinessRequest, userId: string): Promise<Business> => {
    return apiClient.post<Business>(`/businesses?user_id=${userId}`, data);
  },

  /**
   * 사업체 업데이트
   */
  update: async (id: string, data: UpdateBusinessRequest, userId?: string): Promise<Business> => {
    const params = userId ? { user_id: userId } : {};
    return apiClient.patch<Business>(`/businesses/${id}`, data, { params });
  },

  /**
   * 사업체 삭제
   */
  delete: async (id: string, userId?: string): Promise<void> => {
    const params = userId ? { user_id: userId } : {};
    return apiClient.delete(`/businesses/${id}`, { params });
  },

  /**
   * 사업체 대시보드 통계
   */
  getDashboard: async (id: string, userId?: string): Promise<BusinessDashboard> => {
    const params = userId ? { user_id: userId } : {};
    return apiClient.get<BusinessDashboard>(`/businesses/${id}/dashboard`, { params });
  },
};
