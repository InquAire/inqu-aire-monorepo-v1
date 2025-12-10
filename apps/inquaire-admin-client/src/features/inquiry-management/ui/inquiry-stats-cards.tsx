/**
 * Inquiry Stats Cards - Feature UI Component
 */

import { AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';

import { StatsCard, StatsGrid } from '@/shared/ui';

interface InquiryStatsCardsProps {
  stats: {
    new: number;
    inProgress: number;
    completed: number;
    avgResponseTime: string;
  };
  loading?: boolean;
}

export function InquiryStatsCards({ stats, loading = false }: InquiryStatsCardsProps) {
  return (
    <StatsGrid>
      <StatsCard
        label="신규"
        value={stats.new}
        icon={AlertCircle}
        variant="danger"
        loading={loading}
      />
      <StatsCard
        label="진행중"
        value={stats.inProgress}
        icon={Loader2}
        variant="warning"
        loading={loading}
      />
      <StatsCard
        label="완료"
        value={stats.completed}
        icon={CheckCircle2}
        variant="success"
        loading={loading}
      />
      <StatsCard
        label="평균 응답 시간"
        value={stats.avgResponseTime}
        icon={Clock}
        loading={loading}
      />
    </StatsGrid>
  );
}
