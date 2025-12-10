/**
 * 페이지네이션 관련 설정 상수
 */

/**
 * 페이지당 항목 수 설정
 */
export const PAGINATION = {
  /** 문의 목록 페이지당 항목 수 */
  INQUIRIES_PER_PAGE: 20,

  /** 대시보드 최근 문의 표시 개수 */
  RECENT_INQUIRIES_LIMIT: 5,

  /** 기본 테이블 페이지 크기 */
  DEFAULT_PAGE_SIZE: 10,
} as const;
