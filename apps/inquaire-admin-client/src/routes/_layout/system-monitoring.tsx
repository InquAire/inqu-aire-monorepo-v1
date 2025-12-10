import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Webhook as WebhookIcon,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { apiClient } from '@/shared/api/client';
import type { PaginatedResponse } from '@/shared/api/types';
import { PageHeader } from '@/shared/ui';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

export const Route = createFileRoute('/_layout/system-monitoring')({
  component: SystemMonitoringPage,
});

// ============================================
// Types
// ============================================

interface ErrorLog {
  id: string;
  user_id: string | null;
  error_type: string;
  error_code: string | null;
  error_message: string;
  stack_trace: string | null;
  context: unknown;
  resolved: boolean;
  resolved_at: string | null;
  occurred_at: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface WebhookEvent {
  id: string;
  channel_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  processed: boolean;
  processed_at: string | null;
  error_message: string | null;
  retry_count: number;
  received_at: string;
}

interface ErrorLogStats {
  total: number;
  unresolved: number;
  resolved: number;
  by_type: Array<{ error_type: string; count: number }>;
}

interface WebhookEventStats {
  total: number;
  unprocessed: number;
  processed: number;
  failed: number;
}

// ============================================
// API Functions
// ============================================

const errorLogsApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<ErrorLog>> => {
    return apiClient.get<PaginatedResponse<ErrorLog>>('/error-logs', { params });
  },
  getStats: async (): Promise<ErrorLogStats> => {
    return apiClient.get<ErrorLogStats>('/error-logs/stats');
  },
  resolve: async (id: string, resolved: boolean) => {
    return apiClient.patch(`/error-logs/${id}/resolve`, { resolved });
  },
};

const webhookEventsApi = {
  list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<WebhookEvent>> => {
    return apiClient.get<PaginatedResponse<WebhookEvent>>('/webhook-events', { params });
  },
  getStats: async (): Promise<WebhookEventStats> => {
    return apiClient.get<WebhookEventStats>('/webhook-events/stats');
  },
  retry: async (id: string) => {
    return apiClient.post(`/webhook-events/${id}/retry`);
  },
};

// ============================================
// Component
// ============================================

function SystemMonitoringPage() {
  const [activeTab, setActiveTab] = useState('error-logs');
  const [errorTypeFilter, setErrorTypeFilter] = useState<string>('all');
  const [resolvedFilter, setResolvedFilter] = useState<string>('all');
  const [processedFilter, setProcessedFilter] = useState<string>('all');
  const [selectedErrorLog, setSelectedErrorLog] = useState<ErrorLog | null>(null);
  const [selectedWebhookEvent, setSelectedWebhookEvent] = useState<WebhookEvent | null>(null);

  const queryClient = useQueryClient();

  // Error Logs Queries
  const { data: errorLogsData, isLoading: isLoadingErrors } = useQuery({
    queryKey: ['error-logs', errorTypeFilter, resolvedFilter],
    queryFn: () =>
      errorLogsApi.list({
        ...(errorTypeFilter !== 'all' && { error_type: errorTypeFilter }),
        ...(resolvedFilter !== 'all' && { resolved: resolvedFilter === 'resolved' }),
      }),
  });

  const { data: errorStats } = useQuery({
    queryKey: ['error-logs-stats'],
    queryFn: () => errorLogsApi.getStats(),
  });

  // Webhook Events Queries
  const { data: webhookEventsData, isLoading: isLoadingWebhooks } = useQuery({
    queryKey: ['webhook-events', processedFilter],
    queryFn: () =>
      webhookEventsApi.list({
        ...(processedFilter !== 'all' && { processed: processedFilter === 'processed' }),
      }),
  });

  const { data: webhookStats } = useQuery({
    queryKey: ['webhook-events-stats'],
    queryFn: () => webhookEventsApi.getStats(),
  });

  // Mutations
  const resolveError = useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) =>
      errorLogsApi.resolve(id, resolved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      queryClient.invalidateQueries({ queryKey: ['error-logs-stats'] });
      toast.success('에러 상태가 업데이트되었습니다');
    },
    onError: () => {
      toast.error('에러 상태 업데이트 실패');
    },
  });

  const retryWebhook = useMutation({
    mutationFn: (id: string) => webhookEventsApi.retry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-events'] });
      queryClient.invalidateQueries({ queryKey: ['webhook-events-stats'] });
      toast.success('웹훅 이벤트가 재시도 대기열에 추가되었습니다');
    },
    onError: () => {
      toast.error('웹훅 이벤트 재시도 실패');
    },
  });

  const errorLogs = errorLogsData?.data || [];
  const webhookEvents = webhookEventsData?.data || [];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="시스템 모니터링"
        description="에러 로그 및 웹훅 이벤트를 모니터링합니다"
        icon={<Activity className="h-6 w-6" />}
        breadcrumbs={[{ label: '시스템 모니터링' }]}
      />

      <main className="p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="error-logs">
              <AlertTriangle className="mr-2 h-4 w-4" />
              에러 로그
            </TabsTrigger>
            <TabsTrigger value="webhook-events">
              <WebhookIcon className="mr-2 h-4 w-4" />
              웹훅 이벤트
            </TabsTrigger>
          </TabsList>

          {/* Error Logs Tab */}
          <TabsContent value="error-logs" className="space-y-6">
            {/* Error Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">전체 에러</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{errorStats?.total || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">미해결 에러</CardTitle>
                  <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {errorStats?.unresolved || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">해결된 에러</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {errorStats?.resolved || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">가장 많은 유형</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium truncate">
                    {errorStats?.by_type?.[0]?.error_type || '-'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {errorStats?.by_type?.[0]?.count || 0}건
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Error Logs Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Select value={errorTypeFilter} onValueChange={setErrorTypeFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="에러 유형" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 유형</SelectItem>
                      <SelectItem value="webhook_error">Webhook 에러</SelectItem>
                      <SelectItem value="ai_error">AI 에러</SelectItem>
                      <SelectItem value="api_error">API 에러</SelectItem>
                      <SelectItem value="database_error">Database 에러</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 상태</SelectItem>
                      <SelectItem value="unresolved">미해결</SelectItem>
                      <SelectItem value="resolved">해결됨</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Error Logs Table */}
            <Card>
              <CardContent className="pt-6">
                {isLoadingErrors ? (
                  <div className="py-8 text-center text-muted-foreground">로딩 중...</div>
                ) : errorLogs.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">에러 로그가 없습니다</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>유형</TableHead>
                        <TableHead>메시지</TableHead>
                        <TableHead>사용자</TableHead>
                        <TableHead>발생 시간</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorLogs.map(error => (
                        <TableRow key={error.id}>
                          <TableCell>
                            <Badge variant="outline">{error.error_type}</Badge>
                          </TableCell>
                          <TableCell className="max-w-md truncate">{error.error_message}</TableCell>
                          <TableCell>{error.user?.name || error.user?.email || '-'}</TableCell>
                          <TableCell>
                            {new Date(error.occurred_at).toLocaleString('ko-KR')}
                          </TableCell>
                          <TableCell>
                            {error.resolved ? (
                              <Badge className="bg-green-600">해결됨</Badge>
                            ) : (
                              <Badge variant="destructive">미해결</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedErrorLog(error)}
                              >
                                상세
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  resolveError.mutate({ id: error.id, resolved: !error.resolved })
                                }
                              >
                                {error.resolved ? '재오픈' : '해결'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhook Events Tab */}
          <TabsContent value="webhook-events" className="space-y-6">
            {/* Webhook Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">전체 이벤트</CardTitle>
                  <WebhookIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{webhookStats?.total || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">미처리</CardTitle>
                  <Clock className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {webhookStats?.unprocessed || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">처리됨</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {webhookStats?.processed || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">실패</CardTitle>
                  <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{webhookStats?.failed || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Webhook Events Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Select value={processedFilter} onValueChange={setProcessedFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="처리 상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 상태</SelectItem>
                      <SelectItem value="unprocessed">미처리</SelectItem>
                      <SelectItem value="processed">처리됨</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Webhook Events Table */}
            <Card>
              <CardContent className="pt-6">
                {isLoadingWebhooks ? (
                  <div className="py-8 text-center text-muted-foreground">로딩 중...</div>
                ) : webhookEvents.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    웹훅 이벤트가 없습니다
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>이벤트 유형</TableHead>
                        <TableHead>재시도 횟수</TableHead>
                        <TableHead>수신 시간</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {webhookEvents.map(event => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <Badge variant="outline">{event.event_type}</Badge>
                          </TableCell>
                          <TableCell>{event.retry_count}</TableCell>
                          <TableCell>
                            {new Date(event.received_at).toLocaleString('ko-KR')}
                          </TableCell>
                          <TableCell>
                            {event.processed ? (
                              <Badge className="bg-green-600">처리됨</Badge>
                            ) : event.error_message ? (
                              <Badge variant="destructive">실패</Badge>
                            ) : (
                              <Badge className="bg-orange-600">대기중</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedWebhookEvent(event)}
                              >
                                상세
                              </Button>
                              {!event.processed && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => retryWebhook.mutate(event.id)}
                                  disabled={retryWebhook.isPending}
                                >
                                  <RefreshCw className="mr-1 h-3 w-3" />
                                  재시도
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Error Log Detail Dialog */}
        <Dialog open={!!selectedErrorLog} onOpenChange={() => setSelectedErrorLog(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>에러 로그 상세</DialogTitle>
              <DialogDescription>에러 발생 정보 및 스택 트레이스</DialogDescription>
            </DialogHeader>
            {selectedErrorLog && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">에러 유형</div>
                  <div className="mt-1">
                    <Badge>{selectedErrorLog.error_type}</Badge>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">에러 메시지</div>
                  <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                    {selectedErrorLog.error_message}
                  </div>
                </div>
                {selectedErrorLog.stack_trace && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">스택 트레이스</div>
                    <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                      {selectedErrorLog.stack_trace}
                    </pre>
                  </div>
                )}
                {selectedErrorLog.context != null && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">컨텍스트</div>
                    <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                      {JSON.stringify(selectedErrorLog.context, null, 2)}
                    </pre>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-muted-foreground">발생 시간</div>
                  <div className="mt-1 text-sm">
                    {new Date(selectedErrorLog.occurred_at).toLocaleString('ko-KR')}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Webhook Event Detail Dialog */}
        <Dialog open={!!selectedWebhookEvent} onOpenChange={() => setSelectedWebhookEvent(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>웹훅 이벤트 상세</DialogTitle>
              <DialogDescription>웹훅 페이로드 및 처리 정보</DialogDescription>
            </DialogHeader>
            {selectedWebhookEvent && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">이벤트 유형</div>
                  <div className="mt-1">
                    <Badge>{selectedWebhookEvent.event_type}</Badge>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">페이로드</div>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedWebhookEvent.payload, null, 2)}
                  </pre>
                </div>
                {selectedWebhookEvent.error_message && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">에러 메시지</div>
                    <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-900">
                      {selectedWebhookEvent.error_message}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">재시도 횟수</div>
                    <div className="mt-1 text-sm">{selectedWebhookEvent.retry_count}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">수신 시간</div>
                    <div className="mt-1 text-sm">
                      {new Date(selectedWebhookEvent.received_at).toLocaleString('ko-KR')}
                    </div>
                  </div>
                </div>
                {selectedWebhookEvent.processed_at && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">처리 시간</div>
                    <div className="mt-1 text-sm">
                      {new Date(selectedWebhookEvent.processed_at).toLocaleString('ko-KR')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
