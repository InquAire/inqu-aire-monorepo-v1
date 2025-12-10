import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

import type { ApiEnvelope, ApiError } from './types';

import { API } from '@/shared/config/api-config';

type AuthAxiosRequestConfig = AxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
};

/**
 * Type guard to check if envelope is an ApiError
 */
function isApiError(envelope: ApiEnvelope): envelope is ApiError {
  return !envelope.success && 'error' in envelope;
}

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class ApiClient {
  private instance: AxiosInstance;

  constructor(config: ApiClientConfig) {
    this.instance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || API.DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    this.setupInterceptors();
  }

  private isRefreshing = false;
  private refreshFailed = false; // 토큰 갱신 실패 플래그 추가
  private failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
  }> = [];

  private processQueue(error: unknown, token: string | null = null) {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });

    this.failedQueue = [];
  }

  private setupInterceptors() {
    // Request interceptor - 토큰 주입
    this.instance.interceptors.request.use(
      config => {
        const token = this.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Envelope unwrap 및 에러 핸들링
    this.instance.interceptors.response.use(
      response => {
        const envelope = response.data as ApiEnvelope;

        // 백엔드 응답이 { success, data, error, meta } 형태인 경우
        if (envelope && typeof envelope === 'object' && 'success' in envelope) {
          if (envelope.success) {
            // 성공 응답: data만 반환
            response.data = envelope.data;
          } else if (isApiError(envelope)) {
            // 백엔드가 success: false로 응답한 경우
            throw new Error(envelope.error.message || 'API 요청 실패');
          }
        }

        return response;
      },
      async error => {
        const originalRequest = error.config as AuthAxiosRequestConfig;

        // 특정 요청은 refresh 로직을 건너뜀
        if (originalRequest?.skipAuthRefresh) {
          return Promise.reject(error);
        }

        // refresh 요청 자체는 인터셉터를 통과시키지 않음 (무한 루프 방지)
        if (originalRequest.url?.includes('/auth/refresh')) {
          return Promise.reject(error);
        }

        // 401 에러이고 refresh 시도하지 않은 경우
        if (error.response?.status === 401 && !originalRequest._retry) {
          // 이미 토큰 갱신이 실패한 상태면 바로 reject (무한 루프 방지)
          if (this.refreshFailed) {
            return Promise.reject(error);
          }

          if (this.isRefreshing) {
            originalRequest._retry = true;
            // 이미 refresh 중이면 큐에 대기
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(token => {
                if (!token) {
                  return Promise.reject(error);
                }
                originalRequest.headers = originalRequest.headers ?? {};
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.instance(originalRequest);
              })
              .catch(err => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          const refreshToken = this.getRefreshToken();

          if (!refreshToken) {
            this.isRefreshing = false;
            this.refreshFailed = true; // 갱신 실패 플래그 설정
            this.handleUnauthorized();
            return Promise.reject(error);
          }

          try {
            // 토큰 갱신 시도 - skipAuthRefresh 플래그 추가하여 인터셉터 우회
            const response = await this.instance.post(
              '/auth/refresh',
              { refresh_token: refreshToken },
              { skipAuthRefresh: true } as AuthAxiosRequestConfig
            );

            const { access_token, refresh_token: new_refresh_token, expires_in } = response.data;

            // 새 토큰 저장
            this.setToken(access_token, new_refresh_token, expires_in || 900);

            // 갱신 성공 시 실패 플래그 리셋
            this.refreshFailed = false;

            // 대기 중인 요청들 처리
            this.processQueue(null, access_token);

            // 원래 요청 재시도
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return this.instance(originalRequest);
          } catch (refreshError) {
            // 토큰 갱신 실패 시 로그아웃 처리
            this.refreshFailed = true; // 갱신 실패 플래그 설정
            this.processQueue(refreshError, null);
            this.handleUnauthorized();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // 백엔드 에러 응답 처리
        if (error.response?.data) {
          const envelope = error.response.data as ApiEnvelope;
          if (isApiError(envelope)) {
            error.message = envelope.error.message || error.message;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  private handleUnauthorized() {
    if (typeof window === 'undefined') return;
    this.clearToken();

    // 이미 로그인 페이지에 있으면 리다이렉트하지 않음 (무한 루프 방지)
    if (window.location.pathname === '/login') {
      return;
    }

    window.location.href = '/login';
  }

  /**
   * GET 요청
   */
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  /**
   * POST 요청
   */
  async post<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  /**
   * PUT 요청
   */
  async put<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }

  /**
   * PATCH 요청
   */
  async patch<T = unknown, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config);
    return response.data;
  }

  /**
   * DELETE 요청
   */
  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }

  /**
   * 원본 axios 인스턴스 반환 (필요한 경우)
   */
  getAxiosInstance(): AxiosInstance {
    return this.instance;
  }

  /**
   * 토큰 설정
   */
  setToken(accessToken: string, refreshToken?: string, expiresIn?: number) {
    if (typeof window !== 'undefined') {
      // access token 만료 기준도 함께 저장해 자동 refresh 스케줄과 싱크 맞춤
      const expiryTime = Date.now() + (expiresIn || 900) * 1000;

      console.log('[ApiClient] Setting tokens:', {
        expiresIn: expiresIn || 900,
        expiryTime: new Date(expiryTime).toISOString(),
        now: new Date().toISOString(),
      });

      localStorage.setItem('token_expiry', expiryTime.toString());
      localStorage.setItem('access_token', accessToken);
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken);
      }
    }
  }

  /**
   * 토큰 제거
   */
  clearToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expiry');
    }
    // 상태 플래그 리셋
    this.refreshFailed = false;
    this.isRefreshing = false;
    this.failedQueue = [];
  }
}

// 기본 API 클라이언트 인스턴스 생성
export const apiClient = new ApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
});
