/**
 * React Query 최적화 설정
 *
 * 다양한 데이터 타입에 따른 최적화된 캐싱 전략을 제공합니다.
 */

import { DefaultOptions, QueryClient } from '@tanstack/react-query';

/**
 * 데이터 타입별 staleTime 설정
 */
export const STALE_TIME = {
  // 거의 변경되지 않는 데이터 (30분)
  STATIC: 1000 * 60 * 30,

  // 자주 변경되지 않는 데이터 (10분)
  SLOW_CHANGING: 1000 * 60 * 10,

  // 일반 데이터 (5분)
  NORMAL: 1000 * 60 * 5,

  // 자주 변경되는 데이터 (1분)
  FAST_CHANGING: 1000 * 60,

  // 실시간 데이터 (30초)
  REALTIME: 1000 * 30,

  // 즉시 만료
  NO_CACHE: 0,
} as const;

/**
 * 데이터 타입별 gcTime (Garbage Collection Time) 설정
 */
export const GC_TIME = {
  // 30분
  SHORT: 1000 * 60 * 30,

  // 1시간
  NORMAL: 1000 * 60 * 60,

  // 3시간
  LONG: 1000 * 60 * 60 * 3,

  // 24시간
  VERY_LONG: 1000 * 60 * 60 * 24,
} as const;

/**
 * 최적화된 React Query 기본 옵션
 */
export const optimizedQueryConfig: DefaultOptions = {
  queries: {
    // 기본 staleTime: 5분 (일반 데이터)
    staleTime: STALE_TIME.NORMAL,

    // 기본 gcTime: 1시간
    gcTime: GC_TIME.NORMAL,

    // 재시도: 실패 시 1회만 재시도
    retry: (failureCount, error: unknown) => {
      // 4xx 에러는 재시도하지 않음
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'status' in error.response &&
        typeof error.response.status === 'number'
      ) {
        const status = error.response.status;
        if (status >= 400 && status < 500) {
          return false;
        }
      }
      // 최대 2회 재시도
      return failureCount < 2;
    },

    // 윈도우 포커스 시 자동 리페치 비활성화 (성능 향상)
    refetchOnWindowFocus: false,

    // 마운트 시 리페치 비활성화 (staleTime 동안 캐시 사용)
    refetchOnMount: false,

    // 재연결 시 리페치 활성화
    refetchOnReconnect: true,

    // 네트워크 모드: online일 때만 쿼리 실행
    networkMode: 'online',
  },
  mutations: {
    // 뮤테이션 재시도: 1회
    retry: 1,

    // 네트워크 모드: online일 때만 뮤테이션 실행
    networkMode: 'online',
  },
};

/**
 * 최적화된 QueryClient 생성
 */
export function createOptimizedQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: optimizedQueryConfig,
  });
}

/**
 * 특정 쿼리 키에 대한 맞춤 설정
 */
export const queryKeyConfig = {
  // 사용자 프로필 - 자주 변경되지 않음
  profile: {
    staleTime: STALE_TIME.SLOW_CHANGING,
    gcTime: GC_TIME.LONG,
  },

  // 사업체 목록 - 거의 변경되지 않음
  businesses: {
    staleTime: STALE_TIME.STATIC,
    gcTime: GC_TIME.VERY_LONG,
  },

  // 고객 목록 - 일반
  customers: {
    staleTime: STALE_TIME.NORMAL,
    gcTime: GC_TIME.NORMAL,
  },

  // 문의 목록 - 자주 변경됨
  inquiries: {
    staleTime: STALE_TIME.FAST_CHANGING,
    gcTime: GC_TIME.SHORT,
  },

  // 대시보드 통계 - 자주 변경됨
  dashboard: {
    staleTime: STALE_TIME.FAST_CHANGING,
    gcTime: GC_TIME.SHORT,
  },

  // 채널 목록 - 거의 변경되지 않음
  channels: {
    staleTime: STALE_TIME.STATIC,
    gcTime: GC_TIME.LONG,
  },

  // 답변 템플릿 - 거의 변경되지 않음
  replyTemplates: {
    staleTime: STALE_TIME.STATIC,
    gcTime: GC_TIME.LONG,
  },

  // 업종 설정 - 거의 변경되지 않음
  industryConfigs: {
    staleTime: STALE_TIME.STATIC,
    gcTime: GC_TIME.VERY_LONG,
  },

  // 사용자 목록 - 일반
  users: {
    staleTime: STALE_TIME.NORMAL,
    gcTime: GC_TIME.NORMAL,
  },

  // 구독 정보 - 자주 변경되지 않음
  subscriptions: {
    staleTime: STALE_TIME.SLOW_CHANGING,
    gcTime: GC_TIME.LONG,
  },

  // 에러 로그 - 자주 변경됨
  errorLogs: {
    staleTime: STALE_TIME.FAST_CHANGING,
    gcTime: GC_TIME.SHORT,
  },

  // 웹훅 이벤트 - 자주 변경됨
  webhookEvents: {
    staleTime: STALE_TIME.FAST_CHANGING,
    gcTime: GC_TIME.SHORT,
  },
} as const;

/**
 * 쿼리 키 생성 헬퍼
 */
export const queryKeys = {
  profile: () => ['profile'] as const,
  businesses: {
    all: () => ['businesses'] as const,
    list: (filters?: Record<string, unknown>) => ['businesses', 'list', filters] as const,
    detail: (id: string) => ['businesses', 'detail', id] as const,
    dashboard: (id: string) => ['businesses', 'dashboard', id] as const,
  },
  customers: {
    all: () => ['customers'] as const,
    list: (filters?: Record<string, unknown>) => ['customers', 'list', filters] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
    stats: () => ['customers', 'stats'] as const,
  },
  inquiries: {
    all: () => ['inquiries'] as const,
    list: (filters?: Record<string, unknown>) => ['inquiries', 'list', filters] as const,
    detail: (id: string) => ['inquiries', 'detail', id] as const,
    stats: () => ['inquiries', 'stats'] as const,
  },
  channels: {
    all: () => ['channels'] as const,
    list: (filters?: Record<string, unknown>) => ['channels', 'list', filters] as const,
    detail: (id: string) => ['channels', 'detail', id] as const,
    stats: (id: string) => ['channels', 'stats', id] as const,
  },
  replyTemplates: {
    all: () => ['reply-templates'] as const,
    list: (filters?: Record<string, unknown>) => ['reply-templates', 'list', filters] as const,
    detail: (id: string) => ['reply-templates', 'detail', id] as const,
  },
  industryConfigs: {
    all: () => ['industry-configs'] as const,
    list: (filters?: Record<string, unknown>) => ['industry-configs', 'list', filters] as const,
    detail: (id: string) => ['industry-configs', 'detail', id] as const,
    byIndustry: (industry: string) => ['industry-configs', 'by-industry', industry] as const,
  },
  users: {
    all: () => ['users'] as const,
    list: (filters?: Record<string, unknown>) => ['users', 'list', filters] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  subscriptions: {
    all: () => ['subscriptions'] as const,
    detail: (businessId: string) => ['subscriptions', 'detail', businessId] as const,
  },
  errorLogs: {
    all: () => ['error-logs'] as const,
    list: (filters?: Record<string, unknown>) => ['error-logs', 'list', filters] as const,
  },
  webhookEvents: {
    all: () => ['webhook-events'] as const,
    list: (filters?: Record<string, unknown>) => ['webhook-events', 'list', filters] as const,
  },
} as const;
