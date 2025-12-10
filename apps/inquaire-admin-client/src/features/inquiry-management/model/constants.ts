/**
 * Inquiry Management Constants
 */

import { InquiryStatus } from '@/entities/inquiry';

export const statusLabels: Record<
  InquiryStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  [InquiryStatus.NEW]: { label: '신규', variant: 'destructive' },
  [InquiryStatus.IN_PROGRESS]: { label: '진행중', variant: 'default' },
  [InquiryStatus.COMPLETED]: { label: '완료', variant: 'secondary' },
  [InquiryStatus.ON_HOLD]: { label: '보류', variant: 'outline' },
};

export const sentimentLabels: Record<string, string> = {
  POSITIVE: '긍정적',
  NEUTRAL: '중립',
  NEGATIVE: '부정적',
};

export const urgencyLabels: Record<string, { label: string; color: string }> = {
  HIGH: { label: '높음', color: 'text-red-600' },
  MEDIUM: { label: '보통', color: 'text-yellow-600' },
  LOW: { label: '낮음', color: 'text-green-600' },
};
