import {
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
} from '@/shared/config/time-constants';

/**
 * 주어진 날짜 문자열을 상대적 시간 표현으로 변환합니다.
 *
 * @param dateString - ISO 형식의 날짜 문자열
 * @returns 상대적 시간 표현 (예: "3분 전", "2시간 전", "5일 전")
 *
 * @example
 * ```typescript
 * getRelativeTime('2024-01-15T10:30:00Z') // "3분 전"
 * ```
 */
export const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < SECONDS_PER_MINUTE) {
    return `${diffInSeconds}초 전`;
  }

  if (diffInSeconds < SECONDS_PER_HOUR) {
    const minutes = Math.floor(diffInSeconds / SECONDS_PER_MINUTE);
    return `${minutes}분 전`;
  }

  if (diffInSeconds < SECONDS_PER_DAY) {
    const hours = Math.floor(diffInSeconds / SECONDS_PER_HOUR);
    return `${hours}시간 전`;
  }

  const days = Math.floor(diffInSeconds / SECONDS_PER_DAY);
  return `${days}일 전`;
};
