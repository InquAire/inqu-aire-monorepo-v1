/**
 * API 관련 설정 상수
 */

/**
 * API 타임아웃 및 지연 시간 설정
 */
export const API = {
  /** 기본 API 요청 타임아웃 (30초) */
  DEFAULT_TIMEOUT: 30000,

  /** 페이지 리다이렉트 지연 시간 (2초) */
  REDIRECT_DELAY: 2000,

  /** 사용자 프로필 캐시 유지 시간 (5분) */
  PROFILE_CACHE_TIME: 5 * 60 * 1000,
} as const;
