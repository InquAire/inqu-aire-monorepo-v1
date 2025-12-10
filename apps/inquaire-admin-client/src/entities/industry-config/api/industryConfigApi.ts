/**
 * Industry Config Entity - API
 * FSD Entities Layer
 */

import type {
  CreateIndustryConfigRequest,
  IndustryConfig,
  QueryIndustryConfigParams,
  UpdateIndustryConfigRequest,
} from '../model/types';

import { apiClient } from '@/shared/api/client';
import type { PaginatedResponse } from '@/shared/api/types';

/**
 * 업종 설정 API
 */
export const industryConfigApi = {
  /**
   * 업종 설정 목록 조회
   */
  list: async (params?: QueryIndustryConfigParams): Promise<PaginatedResponse<IndustryConfig>> => {
    return apiClient.get<PaginatedResponse<IndustryConfig>>('/industry-configs', { params });
  },

  /**
   * 업종 설정 상세 조회
   */
  get: async (id: string): Promise<IndustryConfig> => {
    return apiClient.get<IndustryConfig>(`/industry-configs/${id}`);
  },

  /**
   * 업종별 설정 조회 (industry 기준)
   */
  getByIndustry: async (industry: string): Promise<IndustryConfig> => {
    return apiClient.get<IndustryConfig>(`/industry-configs/by-industry/${industry}`);
  },

  /**
   * 업종 설정 생성
   */
  create: async (data: CreateIndustryConfigRequest): Promise<IndustryConfig> => {
    return apiClient.post<IndustryConfig>('/industry-configs', data);
  },

  /**
   * 업종 설정 업데이트
   */
  update: async (id: string, data: UpdateIndustryConfigRequest): Promise<IndustryConfig> => {
    return apiClient.patch<IndustryConfig>(`/industry-configs/${id}`, data);
  },

  /**
   * 업종 설정 삭제
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/industry-configs/${id}`);
  },
};

// Deprecated: 하위 호환성을 위한 개별 함수 exports
/** @deprecated Use industryConfigApi.list instead */
export const getIndustryConfigs = industryConfigApi.list;
/** @deprecated Use industryConfigApi.get instead */
export const getIndustryConfig = industryConfigApi.get;
/** @deprecated Use industryConfigApi.getByIndustry instead */
export const getIndustryConfigByIndustry = industryConfigApi.getByIndustry;
/** @deprecated Use industryConfigApi.create instead */
export const createIndustryConfig = industryConfigApi.create;
/** @deprecated Use industryConfigApi.update instead */
export const updateIndustryConfig = industryConfigApi.update;
/** @deprecated Use industryConfigApi.delete instead */
export const deleteIndustryConfig = industryConfigApi.delete;
