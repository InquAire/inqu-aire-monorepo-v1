/**
 * Auth Entity - API
 * FSD Entities Layer
 */

import type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  ProfileResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  SignupRequest,
  SignupResponse,
  UpdateProfileRequest,
} from '../model/types';

import { apiClient } from '@/shared/api/client';

/**
 * 인증 API
 */
export const authApi = {
  /**
   * 회원가입
   */
  signup: async (data: SignupRequest): Promise<SignupResponse> => {
    const response = await apiClient.post<SignupResponse>('/auth/signup', data);
    // 토큰 자동 저장 (expires_in 포함)
    if (response.access_token) {
      apiClient.setToken(response.access_token, response.refresh_token, response.expires_in);
    }
    return response;
  },

  /**
   * 로그인
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    // 토큰 자동 저장 (expires_in 포함)
    if (response.access_token) {
      apiClient.setToken(response.access_token, response.refresh_token, response.expires_in);
    }
    return response;
  },

  /**
   * Access Token 갱신
   */
  refreshToken: async (data: RefreshTokenRequest): Promise<RefreshTokenResponse> => {
    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', data);
    // 새 토큰 저장 (expires_in 포함)
    if (response.access_token) {
      apiClient.setToken(response.access_token, response.refresh_token, response.expires_in);
    }
    return response;
  },

  /**
   * 로그아웃
   */
  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/auth/logout', { refresh_token: refreshToken });
    apiClient.clearToken();
  },

  /**
   * 내 프로필 조회
   */
  getProfile: async (): Promise<ProfileResponse> => {
    return apiClient.get<ProfileResponse>('/auth/profile');
  },

  /**
   * 프로필 업데이트
   */
  updateProfile: async (data: UpdateProfileRequest): Promise<ProfileResponse> => {
    return apiClient.patch<ProfileResponse>('/auth/profile', data);
  },

  /**
   * 비밀번호 변경
   */
  changePassword: async (data: ChangePasswordRequest): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>('/auth/change-password', data);
  },
};
