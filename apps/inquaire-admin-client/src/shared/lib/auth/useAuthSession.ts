/**
 * Auth Session Hook
 * Manages authentication session with automatic token refresh
 */

import { useEffect, useRef } from 'react';

import { getRefreshToken, getTimeUntilExpiry, isTokenExpired } from './tokenManager';

import { useProfile, useRefreshToken } from '@/entities/auth';

/**
 * 자동 토큰 갱신 Hook
 * Access Token이 만료되기 전에 자동으로 갱신
 */
export function useAuthSession() {
  const { data: profile, isError } = useProfile();
  const { mutate: refresh } = useRefreshToken();
  const refreshTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    // 토큰 갱신 스케줄러
    const scheduleTokenRefresh = () => {
      // 기존 타이머 정리
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // 만료까지 남은 시간 확인
      const timeUntilExpiry = getTimeUntilExpiry();

      // 만료 60초 전에 갱신 (또는 이미 만료된 경우 즉시)
      const refreshBuffer = 60 * 1000; // 60초
      const timeUntilRefresh = Math.max(0, timeUntilExpiry - refreshBuffer);

      refreshTimeoutRef.current = setTimeout(() => {
        const refreshTokenValue = getRefreshToken();

        if (refreshTokenValue && !isError) {
          refresh(
            { refresh_token: refreshTokenValue },
            {
              onSuccess: () => {
                // 갱신 성공 후 다시 스케줄
                scheduleTokenRefresh();
              },
              onError: error => {
                console.error('Token refresh failed:', error);
                // 갱신 실패 시 로그아웃 처리는 interceptor가 담당
              },
            }
          );
        }
      }, timeUntilRefresh);
    };

    // 프로필이 로드되고 토큰이 있으면 갱신 스케줄 시작
    if (profile && !isTokenExpired()) {
      scheduleTokenRefresh();
    }

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [profile, isError, refresh]);

  return {
    user: profile,
    isAuthenticated: !!profile,
    isLoading: !profile && !isError,
  };
}
