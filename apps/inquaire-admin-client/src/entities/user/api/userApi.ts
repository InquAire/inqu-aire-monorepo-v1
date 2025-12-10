/**
 * User Entity - API
 * FSD Entities Layer
 */

import type {
  CreateUserRequest,
  QueryUserRequest,
  UpdateRoleRequest,
  UpdateUserRequest,
  User,
  UsersResponse,
  UserStats,
} from '../model/types';

import { apiClient } from '@/shared/api/client';

/**
 * 사용자 관리 API (ADMIN 전용)
 */
export const userApi = {
  /**
   * 사용자 목록 조회
   */
  list: async (params: QueryUserRequest): Promise<UsersResponse> => {
    return apiClient.get<UsersResponse>('/users', { params });
  },

  /**
   * 사용자 상세 조회
   */
  get: async (id: string): Promise<User> => {
    return apiClient.get<User>(`/users/${id}`);
  },

  /**
   * 사용자 생성
   */
  create: async (data: CreateUserRequest): Promise<User> => {
    return apiClient.post<User>('/users', data);
  },

  /**
   * 사용자 업데이트
   */
  update: async (id: string, data: UpdateUserRequest): Promise<User> => {
    return apiClient.patch<User>(`/users/${id}`, data);
  },

  /**
   * 사용자 역할 변경 (SUPER_ADMIN 전용)
   */
  updateRole: async (id: string, data: UpdateRoleRequest): Promise<User> => {
    return apiClient.patch<User>(`/users/${id}/role`, data);
  },

  /**
   * 사용자 삭제
   */
  delete: async (id: string): Promise<User> => {
    return apiClient.delete<User>(`/users/${id}`);
  },

  /**
   * 사용자 통계 조회
   */
  getStats: async (): Promise<UserStats> => {
    return apiClient.get<UserStats>('/users/stats');
  },
};
