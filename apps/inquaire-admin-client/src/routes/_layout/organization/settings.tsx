/**
 * Organization Settings Page
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AlertTriangle, Loader2, Settings, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  useDeleteOrganization,
  useOrganization,
  useUpdateOrganization,
} from '@/entities/organization';
import { useOrganization as useOrganizationContext } from '@/shared/lib/organization';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PageHeader,
  Textarea,
} from '@/shared/ui';
import { PermissionGate } from '@/shared/ui/permission-gate';

export const Route = createFileRoute('/_layout/organization/settings')({
  component: OrganizationSettingsPage,
});

const updateOrganizationSchema = z.object({
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

type UpdateOrganizationForm = z.infer<typeof updateOrganizationSchema>;

function OrganizationSettingsPage() {
  const navigate = useNavigate();
  const { currentOrganization, clearOrganization } = useOrganizationContext();
  const { data: organization, isLoading } = useOrganization(currentOrganization?.id ?? '');
  const updateOrganization = useUpdateOrganization(currentOrganization?.id ?? '');
  const deleteOrganization = useDeleteOrganization();
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const form = useForm<UpdateOrganizationForm>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
    },
  });

  useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name,
        slug: organization.slug,
        description: organization.description ?? '',
      });
    }
  }, [organization, form]);

  const onSubmit = (data: UpdateOrganizationForm) => {
    updateOrganization.mutate({
      name: data.name,
      slug: data.slug || undefined,
      description: data.description || null,
    });
  };

  const handleDelete = () => {
    if (!currentOrganization) return;

    deleteOrganization.mutate(currentOrganization.id, {
      onSuccess: () => {
        clearOrganization();
        navigate({ to: '/dashboard' });
      },
    });
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          title="조직 설정"
          description="조직을 선택해주세요"
          icon={<Settings className="h-6 w-6" />}
          breadcrumbs={[{ label: '조직 관리', href: '/organization' }, { label: '설정' }]}
        />
        <main className="p-8">
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle>조직이 선택되지 않았습니다</CardTitle>
              <CardDescription>사이드바에서 조직을 선택해주세요.</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          title="조직 설정"
          description="조직 정보를 불러오는 중..."
          icon={<Settings className="h-6 w-6" />}
          breadcrumbs={[{ label: '조직 관리', href: '/organization' }, { label: '설정' }]}
        />
        <main className="p-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="조직 설정"
        description={`${organization?.name ?? '조직'} 설정을 관리합니다`}
        icon={<Settings className="h-6 w-6" />}
        breadcrumbs={[{ label: '조직 관리', href: '/organization' }, { label: '설정' }]}
      />

      <main className="p-8 max-w-2xl mx-auto space-y-8">
        {/* General Settings */}
        <PermissionGate permission="organization:settings">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>조직의 기본 정보를 수정합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>조직 이름 *</FormLabel>
                        <FormControl>
                          <Input placeholder="예: 서울치과의원" {...field} />
                        </FormControl>
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
                        <FormDescription>조직을 구별하는 고유 식별자입니다.</FormDescription>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateOrganization.isPending}>
                      {updateOrganization.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      저장
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </PermissionGate>

        {/* Danger Zone */}
        <PermissionGate permission="organization:delete">
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                위험 구역
              </CardTitle>
              <CardDescription>이 작업은 되돌릴 수 없습니다. 신중하게 진행하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    조직 삭제
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>정말로 조직을 삭제하시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <p>
                        이 작업은 되돌릴 수 없습니다. 조직 삭제 시 다음 데이터가 모두 삭제됩니다:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>모든 사업체 및 관련 데이터</li>
                        <li>모든 문의 및 답변 기록</li>
                        <li>모든 고객 정보</li>
                        <li>모든 멤버 정보</li>
                        <li>구독 및 결제 기록</li>
                      </ul>
                      <p className="pt-2">
                        삭제를 확인하려면 조직 이름{' '}
                        <strong className="text-foreground">{organization?.name}</strong>을
                        입력하세요.
                      </p>
                      <Input
                        placeholder="조직 이름 입력"
                        value={deleteConfirmText}
                        onChange={e => setDeleteConfirmText(e.target.value)}
                      />
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>
                      취소
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={
                        deleteConfirmText !== organization?.name || deleteOrganization.isPending
                      }
                      onClick={handleDelete}
                    >
                      {deleteOrganization.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      조직 삭제
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </PermissionGate>
      </main>
    </div>
  );
}
