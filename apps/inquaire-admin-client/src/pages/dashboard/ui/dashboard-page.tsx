/**
 * Dashboard Page - FSD Pages Layer
 *
 * Main dashboard with stats, charts, and recent activity.
 */

import {
  ArrowDown,
  ArrowUp,
  Building2,
  Download,
  LayoutDashboard,
  MessageSquare,
  Users,
  Webhook,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';

import { useBusinesses } from '@/entities/business';
import { useBusinessDashboard } from '@/entities/business/hooks/queries/useBusinessDashboard';
import { useChannels } from '@/entities/channel';
import { useCustomers } from '@/entities/customer';
import { useInquiries } from '@/entities/inquiry';
import { useBusinessContext } from '@/shared/lib';
import {
  exportMultiSheetToExcel,
  transformDashboardStatsForExport,
  type DashboardExportData,
} from '@/shared/lib/export';
import { useOrganization } from '@/shared/lib/organization';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
  Skeleton,
} from '@/shared/ui';

// Chart color palette
const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  teal: '#14b8a6',
  orange: '#f97316',
};

const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: COLORS.success,
  NEUTRAL: COLORS.primary,
  NEGATIVE: COLORS.danger,
};

const STATUS_COLORS: Record<string, string> = {
  NEW: COLORS.primary,
  IN_PROGRESS: COLORS.warning,
  COMPLETED: COLORS.success,
  ON_HOLD: COLORS.purple,
};

export function DashboardPage() {
  const { currentBusiness } = useBusinessContext();
  const { currentOrganization } = useOrganization();
  const { data: businesses, isLoading: isLoadingBusinesses } = useBusinesses(
    currentOrganization?.id ?? ''
  );
  const businessId = currentBusiness?.id ?? businesses?.[0]?.id;

  const { data: dashboardData, isLoading: isLoadingDashboard } = useBusinessDashboard(
    businessId || '',
    undefined
  );

  const { data: inquiriesData, isLoading: isLoadingInquiries } = useInquiries({
    business_id: currentBusiness?.id,
    limit: 10,
  });
  const { data: customersData, isLoading: isLoadingCustomers } = useCustomers({
    business_id: currentBusiness?.id,
    limit: 10,
  });
  const { data: channelsData, isLoading: isLoadingChannels } = useChannels({
    business_id: currentBusiness?.id,
  });

  const isLoading =
    isLoadingBusinesses || isLoadingInquiries || isLoadingCustomers || isLoadingChannels;

  const calculateChange = (current: number, previous: number): string => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    return change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  };

  const stats = [
    {
      name: '총 사업체',
      value: isLoading ? '...' : String(businesses?.length ?? 0),
      change: '+12%',
      changeType: 'increase' as const,
      icon: Building2,
    },
    {
      name: '총 문의',
      value: isLoading
        ? '...'
        : String(dashboardData?.summary?.total_inquiries ?? inquiriesData?.pagination?.total ?? 0),
      change: dashboardData?.summary
        ? calculateChange(
            dashboardData.summary.last_7_days_inquiries,
            dashboardData.summary.last_30_days_inquiries -
              dashboardData.summary.last_7_days_inquiries
          )
        : '+23%',
      changeType: 'increase' as const,
      icon: MessageSquare,
    },
    {
      name: '총 고객',
      value: isLoading
        ? '...'
        : String(dashboardData?.summary?.total_customers ?? customersData?.pagination?.total ?? 0),
      change: dashboardData?.summary
        ? calculateChange(dashboardData.summary.new_customers_last_7_days, 0)
        : '+18%',
      changeType: 'increase' as const,
      icon: Users,
    },
    {
      name: '활성 채널',
      value: isLoading ? '...' : String(channelsData?.filter(c => c.is_active).length ?? 0),
      change: '-2%',
      changeType: 'decrease' as const,
      icon: Webhook,
    },
  ];

  const recentInquiries = inquiriesData?.data?.slice(0, 5) ?? [];

  const inquiryTrendData = dashboardData
    ? [
        { period: '오늘', count: dashboardData.summary.today_inquiries },
        { period: '최근 7일', count: dashboardData.summary.last_7_days_inquiries },
        { period: '최근 30일', count: dashboardData.summary.last_30_days_inquiries },
      ]
    : [];

  const sentimentData =
    dashboardData?.inquiries_by_sentiment
      ?.filter(s => s.sentiment)
      .map(s => ({
        name: s.sentiment === 'POSITIVE' ? '긍정' : s.sentiment === 'NEGATIVE' ? '부정' : '중립',
        value: s.count,
        sentiment: s.sentiment!,
      })) ?? [];

  const statusData =
    dashboardData?.inquiries_by_status?.map(s => ({
      name:
        s.status === 'NEW'
          ? '신규'
          : s.status === 'IN_PROGRESS'
            ? '처리중'
            : s.status === 'COMPLETED'
              ? '완료'
              : '보류',
      value: s.count,
      status: s.status,
    })) ?? [];

  const platformData =
    dashboardData?.top_channels?.map(c => ({
      name: c.channel_name,
      count: c.count,
      platform: c.platform,
    })) ?? [];

  const handleExportStats = () => {
    if (isLoading || !dashboardData) {
      toast.error('데이터를 불러오는 중입니다');
      return;
    }

    try {
      const exportData: DashboardExportData = {
        stats,
        inquiryTrend: inquiryTrendData,
        sentiment: sentimentData,
        status: statusData,
        platform: platformData,
      };

      const sheets = transformDashboardStatsForExport(exportData);
      exportMultiSheetToExcel(sheets, `대시보드_통계_${new Date().toISOString().split('T')[0]}`);
      toast.success('통계 데이터가 다운로드되었습니다');
    } catch (error) {
      toast.error('내보내기 실패', {
        description: error instanceof Error ? error.message : '데이터 다운로드 중 오류가 발생했습니다',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="대시보드"
        description="전체 통계 및 최근 활동을 한눈에 확인하세요"
        icon={<LayoutDashboard className="h-6 w-6" />}
        breadcrumbs={[{ label: '대시보드' }]}
        actions={
          <Button variant="outline" onClick={handleExportStats}>
            <Download className="mr-2 h-4 w-4" />
            통계 내보내기
          </Button>
        }
      />

      <main className="p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map(i => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <Skeleton className="h-6 w-16" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-20 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            stats.map(stat => {
              const Icon = stat.icon;
              return (
                <Card key={stat.name}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="h-12 w-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div
                      className={`flex items-center gap-1 text-sm font-medium ${
                        stat.changeType === 'increase'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {stat.changeType === 'increase' ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )}
                      {stat.change}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{stat.name}</p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>문의 현황</CardTitle>
              <CardDescription>기간별 문의 추이</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDashboard ? (
                <Skeleton className="h-64 w-full" />
              ) : inquiryTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={inquiryTrendData}>
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.primary} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  데이터가 없습니다
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>감정 분석</CardTitle>
              <CardDescription>문의 메시지 감정 분포</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDashboard ? (
                <Skeleton className="h-64 w-full" />
              ) : sentimentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[entry.sentiment]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  데이터가 없습니다
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>문의 상태</CardTitle>
              <CardDescription>상태별 문의 분포</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDashboard ? (
                <Skeleton className="h-64 w-full" />
              ) : statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  데이터가 없습니다
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>채널별 문의</CardTitle>
              <CardDescription>상위 5개 채널</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDashboard ? (
                <Skeleton className="h-64 w-full" />
              ) : platformData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={platformData} layout="vertical">
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.teal} radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  데이터가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>최근 문의</CardTitle>
            <CardDescription>최신 문의 내역을 확인하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingInquiries ? (
                <>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                      <Skeleton className="h-8 w-16" />
                    </div>
                  ))}
                </>
              ) : recentInquiries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">최근 문의가 없습니다</div>
              ) : (
                recentInquiries.map(inquiry => (
                  <div
                    key={inquiry.id}
                    className="flex items-center gap-4 py-3 border-b last:border-0"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate">{inquiry.message_text}</p>
                      <p className="text-xs text-muted-foreground">
                        {inquiry.customer?.name ?? '고객'} ·{' '}
                        {new Date(inquiry.created_at).toLocaleString('ko-KR')}
                      </p>
                    </div>
                    <button className="text-sm text-primary hover:underline font-medium">
                      보기
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
