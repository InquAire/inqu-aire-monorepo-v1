/**
 * Organization Dashboard Page
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Building, Building2, CreditCard, Loader2, Plus, Settings, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useCreateOrganization, useOrganization } from '@/entities/organization';
import { useOrganization as useOrganizationContext } from '@/shared/lib/organization';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PageHeader,
  Progress,
  Textarea,
} from '@/shared/ui';

// 조직 생성 스키마
const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, '조직 이름은 최소 2자 이상이어야 합니다.')
    .max(50, '조직 이름은 최대 50자까지 입력 가능합니다.'),
  slug: z
    .string()
    .min(2, 'URL 식별자는 최소 2자 이상이어야 합니다.')
    .max(30, 'URL 식별자는 최대 30자까지 입력 가능합니다.')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'URL 식별자는 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.'
    )
    .optional()
    .or(z.literal('')),
  description: z.string().max(200, '설명은 최대 200자까지 입력 가능합니다.').optional(),
});

type CreateOrganizationForm = z.infer<typeof createOrganizationSchema>;

type OrganizationSearchParams = {
  create?: boolean;
};

export const Route = createFileRoute('/_layout/organization/')({
  component: OrganizationDashboardPage,
  validateSearch: (search: Record<string, unknown>): OrganizationSearchParams => {
    return {
      create: search.create === true || search.create === 'true',
    };
  },
});

function OrganizationDashboardPage() {
  const { create } = Route.useSearch();
  const navigate = useNavigate();
  const { currentOrganization, currentRole } = useOrganizationContext();
  const { data: organization, isLoading } = useOrganization(currentOrganization?.id ?? '');
  const createOrganization = useCreateOrganization();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // URL 파라미터로 모달 열기
  useEffect(() => {
    if (create) {
      setCreateDialogOpen(true);
      // URL에서 create 파라미터 제거
      navigate({ to: '/organization', search: {}, replace: true });
    }
  }, [create, navigate]);

  const form = useForm<CreateOrganizationForm>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
    },
  });

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    const currentSlug = form.getValues('slug');
    if (!currentSlug) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30);
      form.setValue('slug', generatedSlug);
    }
  };

  const handleCreateOrganization = (data: CreateOrganizationForm) => {
    createOrganization.mutate(
      {
        name: data.name,
        slug: data.slug || undefined,
        description: data.description || undefined,
      },
      {
        onSuccess: () => {
          setCreateDialogOpen(false);
          form.reset();
        },
      }
    );
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          title="조직 관리"
          description="조직을 선택하거나 새로운 조직을 생성하세요"
          icon={<Building className="h-6 w-6" />}
          breadcrumbs={[{ label: '조직 관리' }]}
        />
        <main className="p-8">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle>조직이 선택되지 않았습니다</CardTitle>
              <CardDescription>
                사이드바에서 조직을 선택하거나 새로운 조직을 생성하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />새 조직 생성
              </Button>
            </CardContent>
          </Card>
        </main>

        {/* Create Organization Dialog */}
        <CreateOrganizationDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          form={form}
          onSubmit={handleCreateOrganization}
          isPending={createOrganization.isPending}
          onNameChange={handleNameChange}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          title="조직 관리"
          description="조직 정보를 불러오는 중..."
          icon={<Building className="h-6 w-6" />}
          breadcrumbs={[{ label: '조직 관리' }]}
        />
        <main className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </main>
      </div>
    );
  }

  const subscription = organization?.subscription;
  const usagePercent = subscription
    ? Math.round((subscription.current_usage / subscription.monthly_limit) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={organization?.name ?? '조직 관리'}
        description={organization?.description ?? '조직 대시보드'}
        icon={<Building className="h-6 w-6" />}
        breadcrumbs={[{ label: '조직 관리' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/organization/settings">
                <Settings className="mr-2 h-4 w-4" />
                설정
              </Link>
            </Button>
            <Button asChild>
              <Link to="/organization/members">
                <Users className="mr-2 h-4 w-4" />
                멤버 관리
              </Link>
            </Button>
          </div>
        }
      />

      <main className="p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">내 역할</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge variant={currentRole === 'OWNER' ? 'default' : 'secondary'}>
                {getRoleLabel(currentRole)}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">멤버 수</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organization?.member_count ?? 0}</div>
              {subscription && (
                <p className="text-xs text-muted-foreground">최대 {subscription.max_members}명</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">사업체 수</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organization?.business_count ?? 0}</div>
              {subscription && (
                <p className="text-xs text-muted-foreground">
                  최대 {subscription.max_businesses}개
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">구독 플랜</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge variant="outline">{subscription?.plan ?? 'TRIAL'}</Badge>
              {subscription?.status === 'TRIAL' && subscription.trial_ends_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  체험 종료: {new Date(subscription.trial_ends_at).toLocaleDateString('ko-KR')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Usage Card */}
        {subscription && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">월간 사용량</CardTitle>
              <CardDescription>
                {subscription.billing_cycle_start &&
                  new Date(subscription.billing_cycle_start).toLocaleDateString('ko-KR')}{' '}
                ~{' '}
                {subscription.billing_cycle_end &&
                  new Date(subscription.billing_cycle_end).toLocaleDateString('ko-KR')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>API 호출</span>
                  <span>
                    {subscription.current_usage.toLocaleString()} /{' '}
                    {subscription.monthly_limit.toLocaleString()}
                  </span>
                </div>
                <Progress value={usagePercent} className="h-2" />
                <p className="text-xs text-muted-foreground">{usagePercent}% 사용 중</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <Link to="/organization/members" className="block">
              <CardHeader>
                <Users className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">멤버 관리</CardTitle>
                <CardDescription>조직 멤버를 초대하고 역할을 관리합니다.</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <Link to="/organization/settings" className="block">
              <CardHeader>
                <Settings className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">조직 설정</CardTitle>
                <CardDescription>조직 이름, 설명 등 기본 정보를 수정합니다.</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <Link to="/businesses" className="block">
              <CardHeader>
                <Building2 className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">사업체 관리</CardTitle>
                <CardDescription>조직에 속한 사업체를 관리합니다.</CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>
      </main>
    </div>
  );
}

function getRoleLabel(role: string | null | undefined): string {
  switch (role) {
    case 'OWNER':
      return '소유자';
    case 'ADMIN':
      return '관리자';
    case 'MANAGER':
      return '매니저';
    case 'MEMBER':
      return '멤버';
    case 'VIEWER':
      return '뷰어';
    default:
      return '알 수 없음';
  }
}

// 조직 생성 다이얼로그 컴포넌트
interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ReturnType<typeof useForm<CreateOrganizationForm>>;
  onSubmit: (data: CreateOrganizationForm) => void;
  isPending: boolean;
  onNameChange: (name: string) => void;
}

function CreateOrganizationDialog({
  open,
  onOpenChange,
  form,
  onSubmit,
  isPending,
  onNameChange,
}: CreateOrganizationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>새 조직 생성</DialogTitle>
          <DialogDescription>새로운 조직을 생성하여 팀원들과 함께 작업하세요.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>조직 이름 *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="예: 서울치과의원"
                      {...field}
                      onChange={e => {
                        field.onChange(e);
                        onNameChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>팀이나 회사의 이름을 입력하세요.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL 식별자</FormLabel>
                  <FormControl>
                    <Input placeholder="예: seoul-dental" {...field} />
                  </FormControl>
                  <FormDescription>
                    조직을 구별하는 고유 식별자입니다. 소문자, 숫자, 하이픈만 사용 가능합니다.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="조직에 대한 간단한 설명을 입력하세요."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    조직의 목적이나 활동에 대해 간단히 설명해주세요. (선택사항)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
              >
                취소
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                조직 생성
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
