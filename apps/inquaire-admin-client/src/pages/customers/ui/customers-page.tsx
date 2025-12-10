/**
 * Customers Page - FSD Pages Layer
 *
 * Customer management page with CRUD operations, filtering, and export.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Download,
  Mail,
  MessageSquare,
  MoreVertical,
  Phone,
  Plus,
  Star,
  Trash2,
  TrendingUp,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useBusinesses } from '@/entities/business';
import {
  Customer,
  PlatformType,
  useCreateCustomer,
  useCustomers,
  useDeleteCustomer,
  useMergeCustomers,
  useUpdateCustomer,
} from '@/entities/customer';
import { InquiryStatus, useInquiries } from '@/entities/inquiry';
import { getErrorMessage, useBusinessContext } from '@/shared/lib';
import { exportToFile, transformCustomersForExport } from '@/shared/lib/export';
import { useOrganization } from '@/shared/lib/organization';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
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
  Label,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import type { DateRange } from '@/shared/ui/filter-bar/date-range-filter';
import { DataTable, DataTableColumnHeader } from '@/shared/ui/data-table';

const platformLabels: Record<PlatformType, string> = {
  [PlatformType.KAKAO]: '카카오톡',
  [PlatformType.LINE]: '라인',
  [PlatformType.INSTAGRAM]: '인스타그램',
  [PlatformType.NAVER_TALK]: '네이버톡톡',
  [PlatformType.WEB_CHAT]: '웹챗',
};

const customerSchema = z.object({
  platform_user_id: z.string().min(1, '플랫폼 사용자 ID를 입력해주세요'),
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('올바른 이메일을 입력해주세요').optional().or(z.literal('')),
  phone: z.string().optional(),
  platform: z.nativeEnum(PlatformType),
  tags: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export function CustomersPage() {
  const { currentBusiness } = useBusinessContext();
  const { currentOrganization } = useOrganization();
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [businessFilter, setBusinessFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const handleClearFilters = () => {
    setSearchQuery('');
    setPlatformFilter('');
    setBusinessFilter('');
    setDateRange({ from: null, to: null });
  };

  const { data: customersData, isLoading } = useCustomers({
    search: searchQuery || undefined,
    platform: (platformFilter as PlatformType) || undefined,
    business_id: businessFilter || currentBusiness?.id || undefined,
    start_date: dateRange.from || undefined,
    end_date: dateRange.to || undefined,
  });
  const { data: businesses } = useBusinesses(currentOrganization?.id ?? '');
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const mergeCustomers = useMergeCustomers();

  const customers = customersData?.data ?? [];

  const { data: customerInquiries, isLoading: isLoadingInquiries } = useInquiries(
    selectedCustomer
      ? {
          customer_id: selectedCustomer.id,
          limit: 10,
          sortBy: 'received_at',
          sortOrder: 'desc',
        }
      : undefined
  );

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      platform_user_id: '',
      name: '',
      email: '',
      phone: '',
      platform: PlatformType.KAKAO,
      tags: '',
    },
  });

  const handleAddCustomer = (data: CustomerFormData) => {
    const businessId = currentBusiness?.id ?? businesses?.[0]?.id;

    if (!businessId) {
      toast.error('사업체를 찾을 수 없습니다', {
        description: '먼저 사업체를 선택해주세요.',
      });
      return;
    }

    const tags = data.tags
      ? data.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean)
      : [];

    if (selectedCustomer) {
      updateCustomer.mutate(
        {
          id: selectedCustomer.id,
          data: {
            name: data.name,
            email: data.email || undefined,
            phone: data.phone || undefined,
            tags,
          },
        },
        {
          onSuccess: () => {
            toast.success('고객이 수정되었습니다', {
              description: `${data.name}님의 정보가 업데이트되었습니다.`,
            });
            setAddDialogOpen(false);
            setSelectedCustomer(null);
            form.reset();
          },
          onError: error => {
            toast.error('고객 수정 실패', {
              description: getErrorMessage(error),
            });
          },
        }
      );
    } else {
      createCustomer.mutate(
        {
          business_id: businessId,
          platform_user_id: data.platform_user_id,
          platform: data.platform,
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
          tags,
        },
        {
          onSuccess: () => {
            toast.success('고객이 추가되었습니다', {
              description: `${data.name}님이 등록되었습니다.`,
            });
            setAddDialogOpen(false);
            form.reset();
          },
          onError: error => {
            toast.error('고객 추가 실패', {
              description: getErrorMessage(error),
            });
          },
        }
      );
    }
  };

  const handleDeleteCustomer = () => {
    if (!selectedCustomer) return;

    deleteCustomer.mutate(selectedCustomer.id, {
      onSuccess: () => {
        toast.success('고객이 삭제되었습니다');
        setDeleteDialogOpen(false);
        setSelectedCustomer(null);
      },
      onError: error => {
        toast.error('고객 삭제 실패', {
          description: getErrorMessage(error),
        });
      },
    });
  };

  const handleMergeCustomers = () => {
    if (!selectedCustomer || !mergeTargetId) return;

    mergeCustomers.mutate(
      { sourceId: selectedCustomer.id, targetId: mergeTargetId },
      {
        onSuccess: () => {
          toast.success('고객이 병합되었습니다', {
            description: `${selectedCustomer.name}의 데이터가 병합되었습니다.`,
          });
          setMergeDialogOpen(false);
          setSelectedCustomer(null);
          setMergeTargetId('');
        },
        onError: error => {
          toast.error('고객 병합 실패', {
            description: getErrorMessage(error),
          });
        },
      }
    );
  };

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailSheetOpen(true);
  };

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="고객" />,
        cell: ({ row }) => {
          const customer = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary">
                  {customer.name?.[0]?.toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{customer.name ?? '익명'}</p>
                {customer.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {customer.email}
                  </p>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'phone',
        header: ({ column }) => <DataTableColumnHeader column={column} title="연락처" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            {row.original.phone ?? '-'}
          </div>
        ),
      },
      {
        accessorKey: 'platform',
        header: ({ column }) => <DataTableColumnHeader column={column} title="플랫폼" />,
        cell: ({ row }) => <Badge variant="outline">{platformLabels[row.original.platform]}</Badge>,
        size: 120,
        minSize: 100,
      },
      {
        id: 'business',
        header: '사업체',
        cell: () => <span className="text-sm">-</span>,
      },
      {
        accessorKey: 'inquiry_count',
        header: ({ column }) => <DataTableColumnHeader column={column} title="문의 횟수" />,
        cell: ({ row }) => <span className="text-sm">{row.original.inquiry_count}</span>,
      },
      {
        accessorKey: 'last_contact',
        header: ({ column }) => <DataTableColumnHeader column={column} title="최근 접촉" />,
        cell: ({ row }) => {
          const customer = row.original;
          return customer.last_contact ? (
            <div>
              <p className="text-sm">{new Date(customer.last_contact).toLocaleString('ko-KR')}</p>
              {customer.first_contact && (
                <p className="text-xs text-muted-foreground">
                  최초: {new Date(customer.first_contact).toLocaleDateString('ko-KR')}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">-</p>
          );
        },
      },
      {
        accessorKey: 'tags',
        header: '태그',
        cell: ({ row }) => {
          const tags = row.original.tags;
          return (
            <div className="flex flex-wrap gap-1">
              {tags && tags.length > 0 ? (
                tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-right">작업</div>,
        cell: ({ row }) => {
          const customer = row.original;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">작업 메뉴 열기</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>작업</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleViewDetails(customer)}>
                    <User className="mr-2 h-4 w-4" />
                    상세 보기
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedCustomer(customer);
                      form.reset({
                        platform_user_id: customer.platform_user_id,
                        name: customer.name ?? '',
                        email: customer.email ?? '',
                        phone: customer.phone ?? '',
                        platform: customer.platform,
                        tags: customer.tags?.join(', ') ?? '',
                      });
                      setAddDialogOpen(true);
                    }}
                  >
                    편집
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setMergeTargetId('');
                      setMergeDialogOpen(true);
                    }}
                  >
                    <User className="mr-2 h-4 w-4" />
                    병합
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [form]
  );

  const handleExport = (format: 'xlsx' | 'csv') => {
    if (!customers || customers.length === 0) {
      toast.error('내보낼 데이터가 없습니다');
      return;
    }

    try {
      const transformedData = transformCustomersForExport(customers);
      exportToFile(transformedData, {
        filename: `고객목록_${new Date().toISOString().split('T')[0]}`,
        format,
      });
      toast.success(`${format.toUpperCase()} 파일이 다운로드되었습니다`);
    } catch (error) {
      toast.error('내보내기 실패', {
        description: getErrorMessage(error),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="고객 관리"
        description="고객 정보를 확인하고 관리합니다"
        icon={<User className="h-6 w-6" />}
        breadcrumbs={[{ label: '고객 관리' }]}
        actions={
          <>
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
              고객 추가
            </Button>
          </>
        }
      />

      <main className="p-8">
        {/* Stats Cards */}
        <StatsGrid>
          <StatsCard
            label="총 고객"
            value={customers.length}
            icon={Users}
            variant="primary"
            loading={isLoading}
          />
          <StatsCard
            label="신규 고객 (이번달)"
            value="-"
            icon={UserPlus}
            variant="success"
            loading={isLoading}
          />
          <StatsCard
            label="VIP 고객"
            value={customers.filter(c => c.tags?.includes('VIP')).length}
            icon={Star}
            variant="warning"
            loading={isLoading}
          />
          <StatsCard
            label="평균 문의 횟수"
            value={
              customers.length > 0
                ? (customers.reduce((sum, c) => sum + c.inquiry_count, 0) / customers.length).toFixed(1)
                : '0'
            }
            icon={TrendingUp}
            loading={isLoading}
          />
        </StatsGrid>

        {/* FilterBar */}
        <Card className="p-4 mb-6 border-0 shadow-none">
          <FilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="고객명, 연락처, 이메일로 검색..."
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
                  key: 'business',
                  label: '사업체',
                  type: 'select',
                  searchable: true,
                  options:
                    businesses?.map(b => ({
                      value: b.id,
                      label: b.name,
                    })) ?? [],
                },
                {
                  key: 'date',
                  label: '날짜',
                  type: 'date-range',
                },
              ] as FilterConfig[]
            }
            filterValues={{
              platform: platformFilter,
              business: businessFilter,
              date: dateRange,
            }}
            onFilterChange={(key, value) => {
              if (key === 'platform') setPlatformFilter(value as string);
              if (key === 'business') setBusinessFilter(value as string);
              if (key === 'date') setDateRange(value as DateRange);
            }}
            onClearAll={handleClearFilters}
          />
        </Card>

        {/* DataTable */}
        <Card className="p-0 border-0 shadow-none">
          <DataTable
            columns={columns}
            data={customers}
            loading={isLoading}
            emptyMessage="고객이 없습니다"
            onRowClick={handleViewDetails}
          />
        </Card>
      </main>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedCustomer ? '고객 편집' : '새 고객 추가'}</DialogTitle>
            <DialogDescription>
              {selectedCustomer ? '고객 정보를 수정합니다.' : '새로운 고객 정보를 입력합니다.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddCustomer)} className="space-y-4">
              {!selectedCustomer && (
                <FormField
                  control={form.control}
                  name="platform_user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>플랫폼 사용자 ID *</FormLabel>
                      <FormControl>
                        <Input placeholder="kakao_user_123" {...field} />
                      </FormControl>
                      <FormDescription>
                        카카오톡, LINE 등 플랫폼의 고유 사용자 ID를 입력하세요
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름 *</FormLabel>
                    <FormControl>
                      <Input placeholder="홍길동" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="example@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>전화번호</FormLabel>
                    <FormControl>
                      <Input placeholder="010-1234-5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>플랫폼 *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!!selectedCustomer}
                    >
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
                    {selectedCustomer && (
                      <FormDescription>플랫폼은 수정할 수 없습니다</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>태그</FormLabel>
                    <FormControl>
                      <Input placeholder="VIP, 단골고객 (쉼표로 구분)" {...field} />
                    </FormControl>
                    <FormDescription>여러 태그는 쉼표(,)로 구분해주세요</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddDialogOpen(false);
                    setSelectedCustomer(null);
                    form.reset();
                  }}
                >
                  취소
                </Button>
                <Button type="submit">{selectedCustomer ? '수정' : '추가'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>고객 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 고객을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="py-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-destructive/10 text-destructive">
                    {selectedCustomer.name?.[0]?.toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedCustomer.name ?? '익명'}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedCustomer(null);
              }}
            >
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteCustomer}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>고객 병합</DialogTitle>
            <DialogDescription>중복 고객을 병합하여 하나의 고객으로 통합합니다</DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">병합될 고객 (삭제됨)</p>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedCustomer.name?.[0]?.toUpperCase() ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedCustomer.name ?? '익명'}</p>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.email || '-'}</p>
                    <p className="text-xs text-muted-foreground">
                      문의 {selectedCustomer.inquiry_count}회
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>병합 대상 고객 선택</Label>
                <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="병합 대상 고객을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers
                      .filter(c => c.id !== selectedCustomer.id)
                      .map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name ?? '익명'} (
                          {customer.email || customer.phone || customer.platform_user_id})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>주의:</strong> 병합 작업은 되돌릴 수 없습니다.
                  <br />
                  선택한 고객의 모든 문의 내역이 대상 고객으로 이전되며, 원본 고객은 삭제됩니다.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMergeDialogOpen(false);
                setSelectedCustomer(null);
                setMergeTargetId('');
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleMergeCustomers}
              disabled={!mergeTargetId || mergeCustomers.isPending}
            >
              {mergeCustomers.isPending ? '병합 중...' : '병합'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>고객 상세 정보</SheetTitle>
            <SheetDescription>고객의 상세 정보와 활동 내역을 확인하세요</SheetDescription>
          </SheetHeader>
          {selectedCustomer && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {selectedCustomer.name?.[0]?.toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedCustomer.name ?? '익명'}</h3>
                  <Badge variant="outline">{platformLabels[selectedCustomer.platform]}</Badge>
                </div>
              </div>

              <Separator />

              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="info">기본 정보</TabsTrigger>
                  <TabsTrigger value="activity">활동 내역</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">이메일</p>
                      <p className="text-sm">{selectedCustomer.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">전화번호</p>
                      <p className="text-sm">{selectedCustomer.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">문의 횟수</p>
                      <p className="text-sm">{selectedCustomer.inquiry_count}회</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">최근 접촉</p>
                      <p className="text-sm">
                        {selectedCustomer.last_contact
                          ? new Date(selectedCustomer.last_contact).toLocaleString('ko-KR')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">태그</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedCustomer.tags && selectedCustomer.tags.length > 0 ? (
                          selectedCustomer.tags.map((tag: string) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">태그 없음</span>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="activity" className="mt-4">
                  {isLoadingInquiries ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <Card key={i} className="p-4">
                          <Skeleton className="h-4 w-full mb-2" />
                          <Skeleton className="h-3 w-3/4" />
                        </Card>
                      ))}
                    </div>
                  ) : !customerInquiries || customerInquiries.data.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>문의 내역이 없습니다</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customerInquiries.data.map(inquiry => {
                        const statusColors = {
                          [InquiryStatus.NEW]: 'bg-blue-100 text-blue-800',
                          [InquiryStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800',
                          [InquiryStatus.COMPLETED]: 'bg-green-100 text-green-800',
                          [InquiryStatus.ON_HOLD]: 'bg-gray-100 text-gray-800',
                        };

                        const statusLabels = {
                          [InquiryStatus.NEW]: '신규',
                          [InquiryStatus.IN_PROGRESS]: '진행중',
                          [InquiryStatus.COMPLETED]: '완료',
                          [InquiryStatus.ON_HOLD]: '대기',
                        };

                        return (
                          <Card
                            key={inquiry.id}
                            className="p-4 hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-medium">
                                  {new Date(inquiry.received_at).toLocaleString('ko-KR')}
                                </p>
                              </div>
                              <Badge className={statusColors[inquiry.status]}>
                                {statusLabels[inquiry.status]}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {inquiry.message_text}
                            </p>
                            {inquiry.reply_text && (
                              <div className="mt-2 pt-2 border-t">
                                <p className="text-xs text-muted-foreground mb-1">답변:</p>
                                <p className="text-sm line-clamp-2">{inquiry.reply_text}</p>
                              </div>
                            )}
                            {inquiry.summary && (
                              <div className="mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {inquiry.summary}
                                </Badge>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                      {customerInquiries.pagination.total > 10 && (
                        <div className="text-center pt-2">
                          <p className="text-sm text-muted-foreground">
                            최근 10개 문의만 표시됩니다 (총 {customerInquiries.pagination.total}개)
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setDetailSheetOpen(false);
                    setSelectedCustomer(selectedCustomer);
                    form.reset({
                      platform_user_id: selectedCustomer.platform_user_id,
                      name: selectedCustomer.name ?? '',
                      email: selectedCustomer.email ?? '',
                      phone: selectedCustomer.phone ?? '',
                      platform: selectedCustomer.platform,
                      tags: selectedCustomer.tags?.join(', ') ?? '',
                    });
                    setAddDialogOpen(true);
                  }}
                >
                  편집
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    setDetailSheetOpen(false);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
