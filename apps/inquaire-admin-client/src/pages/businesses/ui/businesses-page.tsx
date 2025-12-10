/**
 * Businesses Page - FSD Pages Layer
 *
 * Business management page with CRUD operations.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef } from '@tanstack/react-table';
import { Building2, Calendar, Download, Layers, MoreVertical, Plus, Trash2, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useProfile } from '@/entities/auth/hooks/queries/useProfile';
import {
  IndustryType,
  useBusinesses,
  useCreateBusiness,
  useDeleteBusiness,
  useUpdateBusiness,
  type Business,
} from '@/entities/business';
import { getErrorMessage } from '@/shared/lib';
import { exportToFile, transformBusinessesForExport } from '@/shared/lib/export';
import { useOrganization } from '@/shared/lib/organization';
import {
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
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatsCard,
  StatsGrid,
} from '@/shared/ui';
import { DataTable, DataTableColumnHeader } from '@/shared/ui/data-table';

const industryLabels: Record<IndustryType, string> = {
  [IndustryType.DENTAL]: '치과',
  [IndustryType.HOSPITAL]: '병원',
  [IndustryType.DERMATOLOGY]: '피부과',
  [IndustryType.PLASTIC_SURGERY]: '성형외과',
  [IndustryType.REAL_ESTATE]: '부동산',
  [IndustryType.BEAUTY_SALON]: '미용실',
  [IndustryType.ACADEMY]: '학원',
  [IndustryType.LAW_FIRM]: '법무법인',
  [IndustryType.OTHER]: '기타',
};

const businessSchema = z.object({
  name: z.string().min(1, '사업체명을 입력해주세요'),
  industry_type: z.nativeEnum(IndustryType),
  address: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url('올바른 URL을 입력해주세요').optional().or(z.literal('')),
});

type BusinessFormData = z.infer<typeof businessSchema>;

export function BusinessesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  const handleClearFilters = () => {
    setSearchQuery('');
    setIndustryFilter('');
  };

  const { data: profile } = useProfile();
  const { currentOrganization } = useOrganization();
  const { data: businessesData, isLoading } = useBusinesses(currentOrganization?.id ?? '');

  // Filter businesses
  const businesses = useMemo(() => {
    return (businessesData ?? []).filter(business => {
      const matchesSearch =
        !searchQuery ||
        business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.address?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesIndustry = !industryFilter || business.industry_type === industryFilter;
      return matchesSearch && matchesIndustry;
    });
  }, [businessesData, searchQuery, industryFilter]);
  const createBusiness = useCreateBusiness(currentOrganization?.id ?? '', profile?.id ?? '');
  const updateBusiness = useUpdateBusiness();
  const deleteBusiness = useDeleteBusiness();

  const form = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: '',
      industry_type: IndustryType.OTHER,
      address: '',
      phone: '',
      website: '',
    },
  });

  const handleAddBusiness = (data: BusinessFormData) => {
    if (selectedBusiness) {
      updateBusiness.mutate(
        {
          id: selectedBusiness.id,
          data: {
            name: data.name,
            industry_type: data.industry_type,
            address: data.address || undefined,
            phone: data.phone || undefined,
            website: data.website || undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success('사업체가 수정되었습니다');
            setAddDialogOpen(false);
            setSelectedBusiness(null);
            form.reset();
          },
          onError: error => {
            toast.error('사업체 수정 실패', {
              description: getErrorMessage(error),
            });
          },
        }
      );
    } else {
      createBusiness.mutate(
        {
          name: data.name,
          industry_type: data.industry_type,
          address: data.address || undefined,
          phone: data.phone || undefined,
          website: data.website || undefined,
        },
        {
          onSuccess: () => {
            toast.success('사업체가 추가되었습니다');
            setAddDialogOpen(false);
            form.reset();
          },
          onError: error => {
            toast.error('사업체 추가 실패', {
              description: getErrorMessage(error),
            });
          },
        }
      );
    }
  };

  const handleDeleteBusiness = () => {
    if (!selectedBusiness) return;

    deleteBusiness.mutate(
      { id: selectedBusiness.id },
      {
        onSuccess: () => {
          toast.success('사업체가 삭제되었습니다');
          setDeleteDialogOpen(false);
          setSelectedBusiness(null);
        },
        onError: error => {
          toast.error('사업체 삭제 실패', {
            description: getErrorMessage(error),
          });
        },
      }
    );
  };

  const columns = useMemo<ColumnDef<Business>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="사업체" />,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{row.original.name}</p>
              <p className="text-xs text-muted-foreground">ID: {row.original.id.slice(0, 8)}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'industry_type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="업종" />,
        cell: ({ row }) => (
          <Badge variant="outline">{industryLabels[row.original.industry_type]}</Badge>
        ),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: 'address',
        header: ({ column }) => <DataTableColumnHeader column={column} title="주소" />,
        cell: ({ row }) => <p className="text-sm text-foreground">{row.original.address ?? '-'}</p>,
      },
      {
        accessorKey: 'phone',
        header: ({ column }) => <DataTableColumnHeader column={column} title="연락처" />,
        cell: ({ row }) => <p className="text-sm text-foreground">{row.original.phone ?? '-'}</p>,
      },
      {
        accessorKey: 'website',
        header: ({ column }) => <DataTableColumnHeader column={column} title="웹사이트" />,
        cell: ({ row }) => {
          const website = row.original.website;
          return website ? (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {website}
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="등록일" />,
        cell: ({ row }) => (
          <p className="text-sm text-foreground">
            {new Date(row.original.created_at).toLocaleDateString('ko-KR')}
          </p>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">작업</div>,
        cell: ({ row }) => (
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
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedBusiness(row.original);
                    form.reset({
                      name: row.original.name,
                      industry_type: row.original.industry_type,
                      address: row.original.address ?? '',
                      phone: row.original.phone ?? '',
                      website: row.original.website ?? '',
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
                    setSelectedBusiness(row.original);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [form]
  );

  const handleExport = (format: 'xlsx' | 'csv') => {
    if (!businesses || businesses.length === 0) {
      toast.error('내보낼 데이터가 없습니다');
      return;
    }

    try {
      const transformedData = transformBusinessesForExport(
        businesses as unknown as Record<string, unknown>[]
      );
      exportToFile(transformedData, {
        filename: `사업체목록_${new Date().toISOString().split('T')[0]}`,
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
        title="사업체 관리"
        description="등록된 사업체를 관리합니다"
        icon={<Building2 className="h-6 w-6" />}
        breadcrumbs={[{ label: '사업체 관리' }]}
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
              사업체 추가
            </Button>
          </>
        }
      />

      <main className="p-8">
        {/* Stats Cards */}
        <StatsGrid>
          <StatsCard
            label="총 사업체"
            value={businessesData?.length ?? 0}
            icon={Building2}
            variant="primary"
            loading={isLoading}
          />
          <StatsCard
            label="활성 사업체"
            value={businessesData?.filter(b => !b.deleted_at).length ?? 0}
            icon={Zap}
            variant="success"
            loading={isLoading}
          />
          <StatsCard
            label="이번 달 신규"
            value={
              businessesData?.filter(b => {
                const createdDate = new Date(b.created_at);
                const now = new Date();
                return (
                  createdDate.getMonth() === now.getMonth() &&
                  createdDate.getFullYear() === now.getFullYear()
                );
              }).length ?? 0
            }
            icon={Calendar}
            variant="warning"
            loading={isLoading}
          />
          <StatsCard
            label="업종 수"
            value={new Set(businessesData?.map(b => b.industry_type)).size ?? 0}
            icon={Layers}
            loading={isLoading}
          />
        </StatsGrid>

        <Card className="p-4 mb-6 border-0 shadow-none">
          <FilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="사업체명, 주소로 검색..."
            filters={
              [
                {
                  key: 'industry',
                  label: '업종',
                  type: 'select',
                  options: Object.entries(industryLabels).map(([value, label]) => ({
                    value,
                    label,
                  })),
                },
              ] as FilterConfig[]
            }
            filterValues={{
              industry: industryFilter,
            }}
            onFilterChange={(key, value) => {
              if (key === 'industry') setIndustryFilter(value as string);
            }}
            onClearAll={handleClearFilters}
          />
        </Card>

        <Card className="p-0 border-0 shadow-none">
          <DataTable
            columns={columns}
            data={businesses}
            loading={isLoading}
            emptyMessage="등록된 사업체가 없습니다"
          />
        </Card>
      </main>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedBusiness ? '사업체 편집' : '새 사업체 추가'}</DialogTitle>
            <DialogDescription>
              {selectedBusiness ? '사업체 정보를 수정합니다.' : '새로운 사업체를 등록합니다.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddBusiness)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>사업체명 *</FormLabel>
                    <FormControl>
                      <Input placeholder="서울치과의원" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="industry_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>업종 *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="업종 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(industryLabels).map(([value, label]) => (
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
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>주소</FormLabel>
                    <FormControl>
                      <Input placeholder="서울시 강남구 테헤란로 123" {...field} />
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
                    <FormLabel>연락처</FormLabel>
                    <FormControl>
                      <Input placeholder="02-1234-5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>웹사이트</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormDescription>https:// 를 포함한 전체 URL을 입력하세요</FormDescription>
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
                    setSelectedBusiness(null);
                    form.reset();
                  }}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={createBusiness.isPending || updateBusiness.isPending}
                >
                  {selectedBusiness ? '수정' : '추가'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>사업체 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 사업체를 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 관련된 모든 채널,
              고객, 문의 데이터가 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          {selectedBusiness && (
            <div className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">{selectedBusiness.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {industryLabels[selectedBusiness.industry_type]}
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
                setSelectedBusiness(null);
              }}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBusiness}
              disabled={deleteBusiness.isPending}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
