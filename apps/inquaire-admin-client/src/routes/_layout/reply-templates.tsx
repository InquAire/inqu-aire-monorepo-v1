import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { type ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, Code, Copy, FileText, Filter, MoreVertical, Plus, Trash2, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useBusinesses } from '@/entities/business';
import {
  useCreateReplyTemplate,
  useDeleteReplyTemplate,
  useReplyTemplates,
  useUpdateReplyTemplate,
  type ReplyTemplate,
} from '@/entities/reply-template';
import { getErrorMessage, useBusinessContext } from '@/shared/lib';
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
  StatsCard,
  StatsGrid,
  Textarea,
} from '@/shared/ui';
import { DataTable, DataTableColumnHeader } from '@/shared/ui/data-table';

export const Route = createFileRoute('/_layout/reply-templates')({
  component: ReplyTemplatesPage,
});

// Template form schema
const templateSchema = z.object({
  name: z.string().min(1, '템플릿 이름을 입력해주세요'),
  type: z.string().optional(),
  content: z.string().min(1, '템플릿 내용을 입력해주세요'),
  variables: z.string().optional(),
  is_active: z.boolean(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

function ReplyTemplatesPage() {
  const { currentBusiness } = useBusinessContext();
  const { currentOrganization } = useOrganization();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReplyTemplate | null>(null);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
  };

  const { data: templatesData, isLoading } = useReplyTemplates({
    business_id: currentBusiness?.id,
  });
  const { data: businesses } = useBusinesses(currentOrganization?.id ?? '');

  const createTemplate = useCreateReplyTemplate();
  const updateTemplate = useUpdateReplyTemplate();
  const deleteTemplate = useDeleteReplyTemplate();

  const allTemplates = templatesData?.data ?? [];

  // Filter templates
  const templates = useMemo(() => {
    return allTemplates.filter(template => {
      const matchesSearch =
        !searchQuery ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'active' && template.is_active) ||
        (statusFilter === 'inactive' && !template.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [allTemplates, searchQuery, statusFilter]);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      type: '',
      content: '',
      variables: '',
      is_active: true,
    },
  });

  const handleSubmit = (data: TemplateFormData) => {
    const businessId = businesses?.[0]?.id;

    if (!businessId) {
      toast.error('사업체를 찾을 수 없습니다');
      return;
    }

    const variables = data.variables
      ? data.variables
          .split(',')
          .map(v => v.trim())
          .filter(Boolean)
      : [];

    if (selectedTemplate) {
      // 수정 모드 - business_id 제외
      const updatePayload = {
        name: data.name,
        type: data.type || undefined,
        content: data.content,
        variables,
        is_active: data.is_active,
      };
      updateTemplate.mutate(
        { id: selectedTemplate.id, data: updatePayload },
        {
          onSuccess: () => {
            toast.success('템플릿이 수정되었습니다');
            setAddDialogOpen(false);
            setSelectedTemplate(null);
            form.reset();
          },
          onError: error => {
            toast.error('템플릿 수정 실패', {
              description: getErrorMessage(error),
            });
          },
        }
      );
    } else {
      // 추가 모드 - business_id 포함
      const createPayload = {
        business_id: businessId,
        name: data.name,
        type: data.type || undefined,
        content: data.content,
        variables,
        is_active: data.is_active,
      };
      createTemplate.mutate(createPayload, {
        onSuccess: () => {
          toast.success('템플릿이 추가되었습니다');
          setAddDialogOpen(false);
          form.reset();
        },
        onError: error => {
          toast.error('템플릿 추가 실패', {
            description: getErrorMessage(error),
          });
        },
      });
    }
  };

  const handleDelete = () => {
    if (!selectedTemplate) return;

    deleteTemplate.mutate(selectedTemplate.id, {
      onSuccess: () => {
        toast.success('템플릿이 삭제되었습니다');
        setDeleteDialogOpen(false);
        setSelectedTemplate(null);
      },
      onError: error => {
        toast.error('템플릿 삭제 실패', {
          description: getErrorMessage(error),
        });
      },
    });
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('템플릿 내용이 복사되었습니다');
  };

  // TanStack Table columns definition
  const columns = useMemo<ColumnDef<ReplyTemplate>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="템플릿 이름" />,
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{row.original.content}</p>
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="유형" />,
        cell: ({ row }) =>
          row.original.type ? (
            <Badge variant="outline">{row.original.type}</Badge>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          ),
      },
      {
        accessorKey: 'variables',
        header: '변수',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.variables && row.original.variables.length > 0 ? (
              row.original.variables.map((variable: string) => (
                <Badge key={variable} variant="secondary" className="text-xs font-mono">
                  {`{{${variable}}}`}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">없음</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'usage_count',
        header: ({ column }) => <DataTableColumnHeader column={column} title="사용 횟수" />,
        cell: ({ row }) => <span className="text-sm">{row.original.usage_count}</span>,
      },
      {
        accessorKey: 'is_active',
        header: ({ column }) => <DataTableColumnHeader column={column} title="상태" />,
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
            {row.original.is_active ? '활성' : '비활성'}
          </Badge>
        ),
        filterFn: (row, id, value) => {
          return value.includes(String(row.getValue(id)));
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-right">작업</div>,
        cell: ({ row }) => {
          const template = row.original;
          return (
            <div className="text-right">
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
                  <DropdownMenuItem onClick={() => handleCopyContent(template.content)}>
                    <Copy className="mr-2 h-4 w-4" />
                    내용 복사
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedTemplate(template);
                      form.reset({
                        name: template.name,
                        type: template.type || '',
                        content: template.content,
                        variables: template.variables?.join(', ') || '',
                        is_active: template.is_active,
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
                      setSelectedTemplate(template);
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

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="답변 템플릿"
        description="자주 사용하는 답변 템플릿을 관리합니다"
        icon={<Code className="h-6 w-6" />}
        breadcrumbs={[{ label: '답변 템플릿' }]}
        actions={
          <Button
            onClick={() => {
              setSelectedTemplate(null);
              form.reset();
              setAddDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            템플릿 추가
          </Button>
        }
      />

      {/* Content */}
      <main className="p-8">
        {/* Stats Cards */}
        <StatsGrid>
          <StatsCard
            label="총 템플릿"
            value={allTemplates.length}
            icon={FileText}
            variant="primary"
            loading={isLoading}
          />
          <StatsCard
            label="활성 템플릿"
            value={allTemplates.filter(t => t.is_active).length}
            icon={CheckCircle2}
            variant="success"
            loading={isLoading}
          />
          <StatsCard
            label="비활성 템플릿"
            value={allTemplates.filter(t => !t.is_active).length}
            icon={XCircle}
            variant="danger"
            loading={isLoading}
          />
          <StatsCard
            label="필터된 결과"
            value={templates.length}
            icon={Filter}
            loading={isLoading}
          />
        </StatsGrid>

        {/* FilterBar */}
        <Card className="p-4 mb-6 border-0 shadow-none">
          <FilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="템플릿 이름, 내용으로 검색..."
            filters={
              [
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
              status: statusFilter,
            }}
            onFilterChange={(key, value) => {
              if (key === 'status') setStatusFilter(value as string);
            }}
            onClearAll={handleClearFilters}
          />
        </Card>

        {/* DataTable */}
        <Card className="p-0 border-0 shadow-none">
          <DataTable
            columns={columns}
            data={templates}
            loading={isLoading}
            emptyMessage="템플릿이 없습니다"
          />
        </Card>
      </main>

      {/* Add/Edit Template Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? '템플릿 편집' : '새 템플릿 추가'}</DialogTitle>
            <DialogDescription>
              {selectedTemplate ? '템플릿 정보를 수정합니다.' : '새로운 답변 템플릿을 추가합니다.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>템플릿 이름 *</FormLabel>
                    <FormControl>
                      <Input placeholder="환영 메시지" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>유형</FormLabel>
                    <FormControl>
                      <Input placeholder="문의, 안내, 감사 등" {...field} />
                    </FormControl>
                    <FormDescription>템플릿 유형을 지정합니다 (선택사항)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>템플릿 내용 *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="안녕하세요 {{customer_name}}님, 문의 주셔서 감사합니다..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      변수를 사용하려면 {`{{변수명}}`} 형식으로 입력하세요
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="variables"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>변수 목록</FormLabel>
                    <FormControl>
                      <Input placeholder="customer_name, business_name, inquiry_type" {...field} />
                    </FormControl>
                    <FormDescription>쉼표(,)로 구분하여 입력하세요</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormLabel>활성 상태</FormLabel>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <FormDescription>템플릿을 활성화합니다</FormDescription>
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
                    setSelectedTemplate(null);
                    form.reset();
                  }}
                >
                  취소
                </Button>
                <Button type="submit">{selectedTemplate ? '수정' : '추가'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>템플릿 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="py-4">
              <p className="font-medium">{selectedTemplate.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{selectedTemplate.content}</p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedTemplate(null);
              }}
            >
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
