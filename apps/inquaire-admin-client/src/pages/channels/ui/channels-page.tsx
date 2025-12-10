/**
 * Channels Page - FSD Pages Layer
 *
 * Channel management page with CRUD operations, webhook handling, and stats.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Bot,
  Copy,
  Download,
  MessageSquare,
  MoreVertical,
  Plus,
  Radio,
  RefreshCw,
  Trash2,
  Webhook,
  Zap,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useBusinesses } from '@/entities/business';
import {
  PlatformType,
  useChannels,
  useChannelStats,
  useCreateChannel,
  useDeleteChannel,
  useRegenerateWebhookUrl,
  useToggleChannelActive,
  useToggleChannelAutoReply,
  useUpdateChannel,
  type Channel,
} from '@/entities/channel';
import { getErrorMessage, useBusinessContext } from '@/shared/lib';
import { exportToFile, transformChannelsForExport } from '@/shared/lib/export';
import { useOrganization } from '@/shared/lib/organization';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChannelIntegrationGuide,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  FilterBar,
  type FilterConfig,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  StatsCard,
  StatsGrid,
  Switch,
} from '@/shared/ui';
import { DataTable, DataTableColumnHeader } from '@/shared/ui/data-table';

const platformLabels: Record<PlatformType, string> = {
  [PlatformType.KAKAO]: '카카오톡',
  [PlatformType.LINE]: '라인',
  [PlatformType.INSTAGRAM]: '인스타그램',
  [PlatformType.NAVER_TALK]: '네이버톡톡',
  [PlatformType.WEB_CHAT]: '웹챗',
};

const channelSchema = z.object({
  platform_channel_id: z.string().min(1, '플랫폼 채널 ID를 입력해주세요'),
  name: z.string().min(1, '채널 이름을 입력해주세요'),
  platform: z.nativeEnum(PlatformType),
  access_token: z.string().optional(),
  auto_reply_enabled: z.boolean(),
});

type ChannelFormData = z.infer<typeof channelSchema>;

export function ChannelsPage() {
  const { currentBusiness } = useBusinessContext();
  const { currentOrganization } = useOrganization();
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statsSheetOpen, setStatsSheetOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  const handleClearFilters = () => {
    setSearchQuery('');
    setPlatformFilter('');
    setStatusFilter('');
  };

  const { data: channelsData, isLoading } = useChannels({
    business_id: currentBusiness?.id,
  });
  const { data: businesses } = useBusinesses(currentOrganization?.id ?? '');
  const { data: channelStats, isLoading: isLoadingStats } = useChannelStats(
    selectedChannel?.id || ''
  );
  const createChannel = useCreateChannel();
  const updateChannel = useUpdateChannel();
  const deleteChannel = useDeleteChannel();
  const toggleActive = useToggleChannelActive();
  const toggleAutoReply = useToggleChannelAutoReply();
  const regenerateWebhook = useRegenerateWebhookUrl();

  const allChannels = channelsData ?? [];

  // Filter channels based on search and filters
  const channels = useMemo(() => {
    return allChannels.filter((channel: Channel) => {
      const matchesSearch =
        !searchQuery ||
        channel.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        channel.platform_channel_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlatform = !platformFilter || channel.platform === platformFilter;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'active' && channel.is_active) ||
        (statusFilter === 'inactive' && !channel.is_active);
      return matchesSearch && matchesPlatform && matchesStatus;
    });
  }, [allChannels, searchQuery, platformFilter, statusFilter]);

  const stats = {
    total: allChannels.length,
    active: allChannels.filter((c: Channel) => c.is_active).length,
    autoReplyEnabled: allChannels.filter((c: Channel) => c.auto_reply_enabled).length,
    totalInquiries: 0,
  };

  const form = useForm<ChannelFormData>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      platform_channel_id: '',
      name: '',
      platform: PlatformType.KAKAO,
      access_token: '',
      auto_reply_enabled: true,
    },
  });

  const handleAddChannel = (data: ChannelFormData) => {
    const businessId = businesses?.[0]?.id;

    if (!businessId) {
      toast.error('사업체를 찾을 수 없습니다', {
        description: '먼저 사업체를 생성해주세요.',
      });
      return;
    }

    if (selectedChannel) {
      updateChannel.mutate(
        {
          id: selectedChannel.id,
          data: {
            name: data.name,
            auto_reply_enabled: data.auto_reply_enabled,
          },
        },
        {
          onSuccess: () => {
            toast.success('채널이 수정되었습니다');
            setAddDialogOpen(false);
            setSelectedChannel(null);
            form.reset();
          },
          onError: error => {
            toast.error('채널 수정 실패', {
              description: getErrorMessage(error),
            });
          },
        }
      );
    } else {
      createChannel.mutate(
        {
          business_id: businessId,
          platform: data.platform,
          platform_channel_id: data.platform_channel_id,
          name: data.name,
          access_token: data.access_token || undefined,
          auto_reply_enabled: data.auto_reply_enabled,
        },
        {
          onSuccess: () => {
            toast.success('채널이 추가되었습니다');
            setAddDialogOpen(false);
            form.reset();
          },
          onError: error => {
            toast.error('채널 추가 실패', {
              description: getErrorMessage(error),
            });
          },
        }
      );
    }
  };

  const handleDeleteChannel = () => {
    if (!selectedChannel) return;

    deleteChannel.mutate(selectedChannel.id, {
      onSuccess: () => {
        toast.success('채널이 삭제되었습니다');
        setDeleteDialogOpen(false);
        setSelectedChannel(null);
      },
      onError: error => {
        toast.error('채널 삭제 실패', {
          description: getErrorMessage(error),
        });
      },
    });
  };

  const handleToggleActive = useCallback(
    (channelId: string) => {
      toggleActive.mutate(channelId, {
        onSuccess: () => {
          toast.success('채널 상태가 변경되었습니다');
        },
        onError: error => {
          toast.error('상태 변경 실패', {
            description: getErrorMessage(error),
          });
        },
      });
    },
    [toggleActive]
  );

  const handleToggleAutoReply = useCallback(
    (channelId: string) => {
      toggleAutoReply.mutate(channelId, {
        onSuccess: () => {
          toast.success('자동 응답 설정이 변경되었습니다');
        },
        onError: error => {
          toast.error('설정 변경 실패', {
            description: getErrorMessage(error),
          });
        },
      });
    },
    [toggleAutoReply]
  );

  const handleRegenerateWebhook = useCallback(
    (channelId: string) => {
      regenerateWebhook.mutate(channelId, {
        onSuccess: () => {
          toast.success('Webhook URL이 재생성되었습니다');
        },
        onError: error => {
          toast.error('Webhook URL 재생성 실패', {
            description: getErrorMessage(error),
          });
        },
      });
    },
    [regenerateWebhook]
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('클립보드에 복사되었습니다');
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    if (!channels || channels.length === 0) {
      toast.error('내보낼 데이터가 없습니다');
      return;
    }

    try {
      const transformedData = transformChannelsForExport(channels);
      exportToFile(transformedData, {
        filename: `채널목록_${new Date().toISOString().split('T')[0]}`,
        format,
      });
      toast.success(`${format.toUpperCase()} 파일이 다운로드되었습니다`);
    } catch (error) {
      toast.error('내보내기 실패', {
        description: getErrorMessage(error),
      });
    }
  };

  const columns = useMemo<ColumnDef<Channel>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="채널" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <Webhook className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {row.original.name ?? '이름 없음'}
              </p>
              <p className="text-xs text-muted-foreground">{row.original.platform_channel_id}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'platform',
        header: ({ column }) => <DataTableColumnHeader column={column} title="플랫폼" />,
        cell: ({ row }) => <Badge variant="outline">{platformLabels[row.original.platform]}</Badge>,
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: 'webhook_url',
        header: 'Webhook URL',
        cell: ({ row }) => {
          const webhookUrl = row.original.webhook_url;
          return (
            <div className="flex items-center gap-2 max-w-sm">
              {webhookUrl ? (
                <>
                  <code className="text-xs text-muted-foreground truncate flex-1">
                    {webhookUrl}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={e => {
                      e.stopPropagation();
                      copyToClipboard(webhookUrl);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                    <span className="sr-only">복사</span>
                  </Button>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'is_active',
        header: ({ column }) => <DataTableColumnHeader column={column} title="상태" />,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0"
            onClick={e => {
              e.stopPropagation();
              handleToggleActive(row.original.id);
            }}
          >
            <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
              {row.original.is_active ? '활성' : '비활성'}
            </Badge>
          </Button>
        ),
      },
      {
        accessorKey: 'auto_reply_enabled',
        header: ({ column }) => <DataTableColumnHeader column={column} title="자동 응답" />,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0"
            onClick={e => {
              e.stopPropagation();
              handleToggleAutoReply(row.original.id);
            }}
          >
            <Badge variant={row.original.auto_reply_enabled ? 'default' : 'outline'}>
              {row.original.auto_reply_enabled ? 'ON' : 'OFF'}
            </Badge>
          </Button>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">작업</div>,
        cell: ({ row }) => {
          const channel = row.original;
          return (
            <div className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={e => {
                    e.stopPropagation();
                    handleRegenerateWebhook(channel.id);
                  }}
                  title="Webhook URL 재생성"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="sr-only">Webhook URL 재생성</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={e => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">작업 메뉴 열기</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>작업</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedChannel(channel);
                        setStatsSheetOpen(true);
                      }}
                    >
                      통계 보기
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedChannel(channel);
                        form.reset({
                          platform_channel_id: channel.platform_channel_id,
                          name: channel.name ?? '',
                          platform: channel.platform,
                          access_token: channel.access_token ?? '',
                          auto_reply_enabled: channel.auto_reply_enabled,
                        });
                        setAddDialogOpen(true);
                      }}
                    >
                      편집
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setSelectedChannel(channel);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        },
      },
    ],
    [form, handleRegenerateWebhook, handleToggleActive, handleToggleAutoReply]
  );

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="채널 관리"
        description="메시징 플랫폼 채널을 관리합니다"
        icon={<Webhook className="h-6 w-6" />}
        breadcrumbs={[{ label: '채널 관리' }]}
        actions={
          <>
            <ChannelIntegrationGuide />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  내보내기
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>CSV (.csv)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              채널 추가
            </Button>
          </>
        }
      />

      <main className="p-8">
        {/* Stats Cards */}
        <StatsGrid>
          <StatsCard
            label="총 채널"
            value={stats.total}
            icon={Radio}
            variant="primary"
            loading={isLoading}
          />
          <StatsCard
            label="활성 채널"
            value={stats.active}
            icon={Zap}
            variant="success"
            loading={isLoading}
          />
          <StatsCard
            label="자동 응답 활성"
            value={stats.autoReplyEnabled}
            icon={Bot}
            variant="warning"
            loading={isLoading}
          />
          <StatsCard
            label="총 문의 수신"
            value="-"
            icon={MessageSquare}
            loading={isLoading}
          />
        </StatsGrid>

        <Card className="p-4 mb-6 border-0 shadow-none">
          <FilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="채널명, 채널 ID로 검색..."
            filters={
              [
                {
                  key: 'platform',
                  label: '플랫폼',
                  type: 'select',
                  options: Object.entries(platformLabels).map(([value, label]) => ({
                    value,
                    label,
                  })),
                },
                {
                  key: 'status',
                  label: '상태',
                  type: 'select',
                  options: [
                    { value: 'active', label: '활성' },
                    { value: 'inactive', label: '비활성' },
                  ],
                },
              ] as FilterConfig[]
            }
            filterValues={{
              platform: platformFilter,
              status: statusFilter,
            }}
            onFilterChange={(key, value) => {
              if (key === 'platform') setPlatformFilter(value as string);
              if (key === 'status') setStatusFilter(value as string);
            }}
            onClearAll={handleClearFilters}
          />
        </Card>

        <DataTable
          columns={columns}
          data={channels}
          loading={isLoading}
          emptyMessage="채널이 없습니다"
        />
      </main>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedChannel ? '채널 편집' : '새 채널 추가'}</DialogTitle>
            <DialogDescription>
              {selectedChannel ? '채널 정보를 수정합니다.' : '새로운 메시징 채널을 등록합니다.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddChannel)} className="space-y-4">
              {!selectedChannel && (
                <>
                  <FormField
                    control={form.control}
                    name="platform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>플랫폼 *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="플랫폼 선택" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(platformLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="platform_channel_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>플랫폼 채널 ID *</FormLabel>
                        <FormControl>
                          <Input placeholder="@your_channel_id" {...field} />
                        </FormControl>
                        <FormDescription>
                          카카오톡은 @채널ID, LINE은 채널 시크릿을 입력하세요
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="access_token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>액세스 토큰</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="선택사항" {...field} />
                        </FormControl>
                        <FormDescription>플랫폼 API 액세스 토큰 (선택)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>채널 이름 *</FormLabel>
                    <FormControl>
                      <Input placeholder="우리 회사 카카오톡" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="auto_reply_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">자동 응답</FormLabel>
                      <FormDescription>AI가 자동으로 고객 문의에 답변합니다</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddDialogOpen(false);
                    setSelectedChannel(null);
                    form.reset();
                  }}
                >
                  취소
                </Button>
                <Button type="submit" disabled={createChannel.isPending || updateChannel.isPending}>
                  {selectedChannel ? '수정' : '추가'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>채널 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 채널을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 관련된 모든 데이터가
              삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          {selectedChannel && (
            <div className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Webhook className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">{selectedChannel.name ?? '이름 없음'}</p>
                  <p className="text-sm text-muted-foreground">
                    {platformLabels[selectedChannel.platform]} -{' '}
                    {selectedChannel.platform_channel_id}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedChannel(null);
              }}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteChannel}
              disabled={deleteChannel.isPending}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={statsSheetOpen} onOpenChange={setStatsSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedChannel && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle>채널 통계</SheetTitle>
                <SheetDescription>{selectedChannel.name ?? '이름 없음'}</SheetDescription>
              </SheetHeader>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">채널 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">플랫폼</span>
                    <Badge variant="outline">{platformLabels[selectedChannel.platform]}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">채널 ID</span>
                    <span className="text-sm font-mono">{selectedChannel.platform_channel_id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">상태</span>
                    <Badge variant={selectedChannel.is_active ? 'default' : 'secondary'}>
                      {selectedChannel.is_active ? '활성' : '비활성'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">자동 응답</span>
                    <Badge variant={selectedChannel.auto_reply_enabled ? 'default' : 'outline'}>
                      {selectedChannel.auto_reply_enabled ? 'ON' : 'OFF'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {isLoadingStats ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">통계 정보</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : channelStats ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">문의 통계</CardTitle>
                      <CardDescription>이 채널을 통해 접수된 문의 현황</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-600 font-medium mb-1">총 문의</p>
                          <p className="text-2xl font-bold text-blue-900">
                            {channelStats.stats.total_inquiries.toLocaleString()}
                          </p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-600 font-medium mb-1">오늘 문의</p>
                          <p className="text-2xl font-bold text-green-900">
                            {channelStats.stats.today_inquiries.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">응답 성능</CardTitle>
                      <CardDescription>문의 처리 및 응답 시간</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">평균 응답 시간</span>
                        <span className="text-sm font-medium">
                          {channelStats.stats.avg_response_time !== null
                            ? `${Math.round(channelStats.stats.avg_response_time / 60)}분`
                            : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">마지막 문의</span>
                        <span className="text-sm font-medium">
                          {channelStats.stats.last_inquiry_at
                            ? new Date(channelStats.stats.last_inquiry_at).toLocaleString('ko-KR')
                            : '없음'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Separator />

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Webhook 정보</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedChannel.webhook_url && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Webhook URL</p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs bg-slate-100 p-2 rounded overflow-x-auto">
                              {selectedChannel.webhook_url}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(selectedChannel.webhook_url!)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {selectedChannel.last_synced_at && (
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm text-muted-foreground">마지막 동기화</span>
                          <span className="text-sm font-medium">
                            {new Date(selectedChannel.last_synced_at).toLocaleString('ko-KR')}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    통계 정보를 불러올 수 없습니다
                  </CardContent>
                </Card>
              )}

              <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
                <p>생성일: {new Date(selectedChannel.created_at).toLocaleString('ko-KR')}</p>
                <p>수정일: {new Date(selectedChannel.updated_at).toLocaleString('ko-KR')}</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
