/**
 * 문의 상태 관련 유틸리티 함수
 */

import type { LucideIcon } from 'lucide-react';
import { AlertCircle, CheckCircle2, Clock, Pause } from 'lucide-react';

export interface StatusBadgeInfo {
  bg: string;
  text: string;
  icon: LucideIcon;
}

/**
 * 상태별 배지 스타일 정보 반환
 */
export const getStatusBadge = (status: string): StatusBadgeInfo => {
  const badges: Record<string, StatusBadgeInfo> = {
    NEW: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
    IN_PROGRESS: { bg: 'bg-orange-100', text: 'text-orange-700', icon: Clock },
    COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
    ON_HOLD: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Pause },
  };
  return badges[status] || badges.NEW;
};

/**
 * 상태 텍스트 한글 변환
 */
export const getStatusText = (status: string): string => {
  const statusText: Record<string, string> = {
    NEW: '신규',
    IN_PROGRESS: '진행중',
    COMPLETED: '완료',
    ON_HOLD: '보류',
  };
  return statusText[status] || status;
};

/**
 * 상태별 배지 클래스 문자열 반환 (간단한 버전)
 */
export const getStatusBadgeClass = (status: string): string => {
  const statusInfo = getStatusBadge(status);
  return `${statusInfo.bg} ${statusInfo.text}`;
};
