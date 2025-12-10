import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { type ColumnDef } from '@tanstack/react-table';
import { Building2, Clock, Filter, Layers, MoreVertical, Plus, Settings, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  IndustryLabels,
  IndustryType,
  useCreateIndustryConfig,
  useDeleteIndustryConfig,
  useIndustryConfigs,
  useUpdateIndustryConfig,
  type IndustryConfig,
} from '@/entities/industry-config';
import { getErrorMessage } from '@/shared/lib';
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
  Textarea,
} from '@/shared/ui';
import { DataTable, DataTableColumnHeader } from '@/shared/ui/data-table';

export const Route = createFileRoute('/_layout/industry-configs')({
  component: IndustryConfigsPage,
});

// Form schema
const configSchema = z.object({
  industry: z.nativeEnum(IndustryType),
  display_name: z.string().min(1, '표시 이름을 입력해주세요'),
  inquiry_types: z.string().min(1, '문의 유형 JSON을 입력해주세요'),
  system_prompt: z.string().min(1, 'System Prompt를 입력해주세요'),
  extraction_schema: z.string().min(1, '추출 스키마 JSON을 입력해주세요'),
  default_templates: z.string().optional(),
});

type ConfigFormData = z.infer<typeof configSchema>;

function IndustryConfigsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<IndustryConfig | null>(null);

  const handleClearFilters = () => {
    setSearchQuery('');
    setIndustryFilter('');
  };

  const { data: configsData, isLoading } = useIndustryConfigs({
    industry: (industryFilter as IndustryType) || undefined,
  });
  const createConfig = useCreateIndustryConfig();
  const updateConfig = useUpdateIndustryConfig();
  const deleteConfig = useDeleteIndustryConfig();

  const allConfigs = configsData?.data ?? [];

  // Filter configs
  const configs = useMemo(() => {
    return allConfigs.filter(config => {
      const matchesSearch =
        !searchQuery ||
        config.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        IndustryLabels[config.industry].toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [allConfigs, searchQuery]);

  // TanStack Table columns
  const columns = useMemo<ColumnDef<IndustryConfig>[]>(
    () => [
      {
        accessorKey: 'industry',
        header: ({ column }) => <DataTableColumnHeader column={column} title="업종" />,
        cell: ({ row }) => <Badge variant="outline">{IndustryLabels[row.original.industry]}</Badge>,
      },
      {
        accessorKey: 'display_name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="표시 이름" />,
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.display_name}</span>
        ),
      },
      {
        accessorKey: 'system_prompt',
        header: 'System Prompt',
        cell: ({ row }) => (
          <p className="text-sm text-muted-foreground line-clamp-2 max-w-md">
            {row.original.system_prompt}
          </p>
        ),
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="등록일" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {new Date(row.original.created_at).toLocaleDateString('ko-KR')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">작업</div>,
        cell: ({ row }) => {
          const config = row.original;
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
                  <DropdownMenuItem onClick={() => handleOpenEditDialog(config)}>
                    수정
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleOpenDeleteDialog(config)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    []
  );

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      industry: IndustryType.HOSPITAL,
      display_name: '',
      inquiry_types: JSON.stringify({ types: ['예약', '상담', '문의'] }, null, 2),
      system_prompt: '',
      extraction_schema: JSON.stringify({ fields: [] }, null, 2),
      default_templates: JSON.stringify({}, null, 2),
    },
  });

  const handleOpenAddDialog = () => {
    setSelectedConfig(null);
    form.reset({
      industry: IndustryType.HOSPITAL,
      display_name: '',
      inquiry_types: JSON.stringify({ types: ['예약', '상담', '문의'] }, null, 2),
      system_prompt: '',
      extraction_schema: JSON.stringify({ fields: [] }, null, 2),
      default_templates: JSON.stringify({}, null, 2),
    });
    setAddDialogOpen(true);
  };

  const handleOpenEditDialog = (config: IndustryConfig) => {
    setSelectedConfig(config);
    form.reset({
      industry: config.industry,
      display_name: config.display_name,
      inquiry_types: JSON.stringify(config.inquiry_types, null, 2),
      system_prompt: config.system_prompt,
      extraction_schema: JSON.stringify(config.extraction_schema, null, 2),
      default_templates: config.default_templates
        ? JSON.stringify(config.default_templates, null, 2)
        : '',
    });
    setAddDialogOpen(true);
  };

  const handleOpenDeleteDialog = (config: IndustryConfig) => {
    setSelectedConfig(config);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (data: ConfigFormData) => {
    try {
      // JSON 파싱 검증
      const inquiryTypes = JSON.parse(data.inquiry_types);
      const extractionSchema = JSON.parse(data.extraction_schema);
      const defaultTemplates = data.default_templates
        ? JSON.parse(data.default_templates)
        : undefined;

      const payload = {
        industry: data.industry,
        display_name: data.display_name,
        inquiry_types: inquiryTypes,
        system_prompt: data.system_prompt,
        extraction_schema: extractionSchema,
        default_templates: defaultTemplates,
      };

      if (selectedConfig) {
        // 편집 모드 - industry 제외
        updateConfig.mutate(
          {
            id: selectedConfig.id,
            data: {
              display_name: payload.display_name,
              inquiry_types: payload.inquiry_types,
              system_prompt: payload.system_prompt,
              extraction_schema: payload.extraction_schema,
              default_templates: payload.default_templates,
            },
          },
          {
            onSuccess: () => {
              toast.success('업종 설정이 수정되었습니다');
              setAddDialogOpen(false);
              setSelectedConfig(null);
              form.reset();
            },
            onError: error => {
              toast.error('수정 실패', {
                description: getErrorMessage(error),
              });
            },
          }
        );
      } else {
        // 추가 모드
        createConfig.mutate(payload, {
          onSuccess: () => {
            toast.success('업종 설정이 추가되었습니다');
            setAddDialogOpen(false);
            form.reset();
          },
          onError: error => {
            toast.error('추가 실패', {
              description: getErrorMessage(error),
            });
          },
        });
      }
    } catch {
      toast.error('JSON 파싱 실패', {
        description: 'JSON 형식이 올바르지 않습니다.',
      });
    }
  };

  const handleDelete = () => {
    if (!selectedConfig) return;

    deleteConfig.mutate(selectedConfig.id, {
      onSuccess: () => {
        toast.success('업종 설정이 삭제되었습니다');
        setDeleteDialogOpen(false);
        setSelectedConfig(null);
      },
      onError: error => {
        toast.error('삭제 실패', {
          description: getErrorMessage(error),
        });
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="업종별 설정 관리"
        description="업종별 AI 프롬프트 및 추출 스키마를 관리합니다"
        icon={<Building2 className="h-6 w-6" />}
        breadcrumbs={[{ label: '업종별 설정' }]}
        actions={
          <Button onClick={handleOpenAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            설정 추가
          </Button>
        }
      />

      {/* Content */}
      <main className="p-8">
        {/* Stats Cards */}
        <StatsGrid>
          <StatsCard
            label="총 설정"
            value={allConfigs.length}
            icon={Settings}
            variant="primary"
            loading={isLoading}
          />
          <StatsCard
            label="필터된 설정"
            value={configs.length}
            icon={Filter}
            variant="success"
            loading={isLoading}
          />
          <StatsCard
            label="업종 수"
            value={new Set(allConfigs.map(c => c.industry)).size}
            icon={Layers}
            variant="warning"
            loading={isLoading}
          />
          <StatsCard
            label="최근 수정"
            value="-"
            icon={Clock}
            loading={isLoading}
          />
        </StatsGrid>

        {/* FilterBar */}
        <Card className="p-4 mb-6 border-0 shadow-none">
          <FilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="업종 또는 표시 이름으로 검색..."
            filters={
              [
                {
                  key: 'industry',
                  label: '업종',
                  type: 'select',
                  options: Object.entries(IndustryLabels).map(([value, label]) => ({
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

        {/* DataTable */}
        <Card className="p-0 border-0 shadow-none">
          <DataTable
            columns={columns}
            data={configs}
            loading={isLoading}
            emptyMessage="업종 설정이 없습니다"
          />
        </Card>
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedConfig ? '업종 설정 수정' : '업종 설정 추가'}</DialogTitle>
            <DialogDescription>
              {selectedConfig ? '업종 설정 정보를 수정합니다' : '새로운 업종 설정을 추가합니다'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>업종 *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!selectedConfig}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="업종 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(IndustryLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedConfig && (
                      <FormDescription>업종은 수정할 수 없습니다 (unique key)</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>표시 이름 *</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 병원" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="system_prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Prompt *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="당신은 병원 고객 문의를 처리하는 AI 어시스턴트입니다..."
                        className="min-h-[100px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>AI가 사용할 System Prompt</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="inquiry_types"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>문의 유형 (JSON) *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"types": ["예약", "상담", "문의"]}'
                        className="min-h-20 font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>JSON 형식으로 입력</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="extraction_schema"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>추출 스키마 (JSON) *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"fields": ["name", "phone", "date"]}'
                        className="min-h-20 font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>정보 추출 스키마 (JSON 형식)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="default_templates"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>기본 템플릿 (JSON, 선택)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"welcome": "안녕하세요", "closing": "감사합니다"}'
                        className="min-h-20 font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>기본 템플릿 (선택사항, JSON 형식)</FormDescription>
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
                    setSelectedConfig(null);
                    form.reset();
                  }}
                >
                  취소
                </Button>
                <Button type="submit" disabled={createConfig.isPending || updateConfig.isPending}>
                  {createConfig.isPending || updateConfig.isPending
                    ? '처리 중...'
                    : selectedConfig
                      ? '수정'
                      : '추가'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>업종 설정 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 업종 설정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          {selectedConfig && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">업종:</span> {IndustryLabels[selectedConfig.industry]}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-medium">표시 이름:</span> {selectedConfig.display_name}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedConfig(null);
              }}
            >
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteConfig.isPending}>
              {deleteConfig.isPending ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
