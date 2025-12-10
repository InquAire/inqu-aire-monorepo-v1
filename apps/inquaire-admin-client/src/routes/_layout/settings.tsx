import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute } from '@tanstack/react-router';
import { Bell, Key, Settings as SettingsIcon, Shield, User as UserIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useChangePassword, useProfile, useUpdateProfile } from '@/entities/auth';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { getErrorMessage } from '@/shared/lib';
import { Button, Card, Input, Label, PageHeader, Switch } from '@/shared/ui';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';

export const Route = createFileRoute('/_layout/settings')({
  component: SettingsPage,
});

// 프로필 폼 스키마
const profileSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('올바른 이메일을 입력해주세요'),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// 비밀번호 변경 폼 스키마
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요'),
    newPassword: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

function SettingsPage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const { preferences, updatePreferences } = useNotifications();

  // 프로필 폼
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: profile
      ? {
          name: profile.name || '',
          email: profile.email || '',
          phone: profile.phone || '',
        }
      : undefined,
  });

  // 비밀번호 변경 폼
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // 프로필 저장 핸들러
  const handleProfileSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(data, {
      onSuccess: () => {
        toast.success('프로필이 업데이트되었습니다');
      },
      onError: error => {
        toast.error('프로필 업데이트 실패', {
          description: getErrorMessage(error),
        });
      },
    });
  };

  // 비밀번호 변경 핸들러
  const handlePasswordSubmit = (data: PasswordFormData) => {
    changePassword.mutate(
      {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
      {
        onSuccess: () => {
          toast.success('비밀번호가 변경되었습니다');
          passwordForm.reset();
        },
        onError: error => {
          toast.error('비밀번호 변경 실패', {
            description: getErrorMessage(error),
          });
        },
      }
    );
  };

  // 알림 설정 변경 핸들러
  const handlePreferenceChange = (key: keyof typeof preferences, value: boolean) => {
    updatePreferences({ ...preferences, [key]: value });
    toast.success('알림 설정이 변경되었습니다');
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="설정"
        description="시스템 설정을 관리합니다"
        icon={<SettingsIcon className="h-6 w-6" />}
        breadcrumbs={[{ label: '설정' }]}
      />

      {/* Content */}
      <main className="p-8 max-w-4xl">
        <div className="space-y-6">
          {/* Profile Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">프로필 설정</h3>
                <p className="text-sm text-muted-foreground">계정 정보를 관리합니다</p>
              </div>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">로딩 중...</div>
            ) : (
              <Form {...profileForm}>
                <form
                  onSubmit={profileForm.handleSubmit(handleProfileSubmit)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>이름</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>이메일</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>연락처</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={updateProfile.isPending || !profileForm.formState.isDirty}
                    >
                      {updateProfile.isPending ? '저장 중...' : '저장'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </Card>

          {/* Security Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">보안 설정</h3>
                <p className="text-sm text-muted-foreground">비밀번호 및 보안 설정을 관리합니다</p>
              </div>
            </div>

            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>현재 비밀번호</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>새 비밀번호</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>비밀번호 확인</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" variant="outline" disabled={changePassword.isPending}>
                    {changePassword.isPending ? '변경 중...' : '비밀번호 변경'}
                  </Button>
                </div>
              </form>
            </Form>
          </Card>

          {/* API Settings - Placeholder */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                <Key className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">API 설정</h3>
                <p className="text-sm text-muted-foreground">API 키 및 웹훅 설정을 관리합니다</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="api-key">API 키</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="api-key"
                    value="sk_live_********************"
                    readOnly
                    className="flex-1"
                  />
                  <Button variant="outline" disabled>
                    재생성
                  </Button>
                  <Button variant="outline" disabled>
                    복사
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  API 키 기능은 향후 추가될 예정입니다.
                </p>
              </div>
            </div>
          </Card>

          {/* Notification Settings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">알림 설정</h3>
                <p className="text-sm text-muted-foreground">알림 수신 설정을 관리합니다</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* 전체 알림 활성화 */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div>
                  <p className="font-semibold text-foreground">알림 활성화</p>
                  <p className="text-sm text-muted-foreground">
                    모든 알림을 활성화하거나 비활성화합니다
                  </p>
                </div>
                <Switch
                  checked={preferences.enabled}
                  onCheckedChange={checked => handlePreferenceChange('enabled', checked)}
                />
              </div>

              {/* 알림 유형별 설정 */}
              <div className="space-y-3 pt-2">
                <p className="text-sm font-medium text-foreground">알림 유형</p>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <p className="font-medium text-foreground">새로운 문의</p>
                    <p className="text-sm text-muted-foreground">
                      새로운 고객 문의가 등록되면 알림
                    </p>
                  </div>
                  <Switch
                    checked={preferences.newInquiry}
                    onCheckedChange={checked => handlePreferenceChange('newInquiry', checked)}
                    disabled={!preferences.enabled}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <p className="font-medium text-foreground">긴급 문의</p>
                    <p className="text-sm text-muted-foreground">긴급도가 높은 문의 즉시 알림</p>
                  </div>
                  <Switch
                    checked={preferences.urgentInquiry}
                    onCheckedChange={checked => handlePreferenceChange('urgentInquiry', checked)}
                    disabled={!preferences.enabled}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <p className="font-medium text-foreground">채널 오류</p>
                    <p className="text-sm text-muted-foreground">채널 연동 오류 발생 시 알림</p>
                  </div>
                  <Switch
                    checked={preferences.channelError}
                    onCheckedChange={checked => handlePreferenceChange('channelError', checked)}
                    disabled={!preferences.enabled}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <p className="font-medium text-foreground">결제 성공</p>
                    <p className="text-sm text-muted-foreground">결제가 성공적으로 완료되면 알림</p>
                  </div>
                  <Switch
                    checked={preferences.paymentSuccess}
                    onCheckedChange={checked => handlePreferenceChange('paymentSuccess', checked)}
                    disabled={!preferences.enabled}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <p className="font-medium text-foreground">결제 실패</p>
                    <p className="text-sm text-muted-foreground">결제 실패 시 즉시 알림</p>
                  </div>
                  <Switch
                    checked={preferences.paymentFailed}
                    onCheckedChange={checked => handlePreferenceChange('paymentFailed', checked)}
                    disabled={!preferences.enabled}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <p className="font-medium text-foreground">구독 만료 예정</p>
                    <p className="text-sm text-muted-foreground">구독 만료가 임박하면 알림</p>
                  </div>
                  <Switch
                    checked={preferences.subscriptionExpiring}
                    onCheckedChange={checked =>
                      handlePreferenceChange('subscriptionExpiring', checked)
                    }
                    disabled={!preferences.enabled}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <p className="font-medium text-foreground">시스템 업데이트</p>
                    <p className="text-sm text-muted-foreground">
                      시스템 업데이트 및 공지사항 알림
                    </p>
                  </div>
                  <Switch
                    checked={preferences.systemUpdate}
                    onCheckedChange={checked => handlePreferenceChange('systemUpdate', checked)}
                    disabled={!preferences.enabled}
                  />
                </div>
              </div>

              {/* 알림 방식 설정 */}
              <div className="space-y-3 pt-4 border-t">
                <p className="text-sm font-medium text-foreground">알림 방식</p>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <p className="font-medium text-foreground">사운드 알림</p>
                    <p className="text-sm text-muted-foreground">알림 수신 시 사운드 재생</p>
                  </div>
                  <Switch
                    checked={preferences.soundEnabled}
                    onCheckedChange={checked => handlePreferenceChange('soundEnabled', checked)}
                    disabled={!preferences.enabled}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <p className="font-medium text-foreground">데스크톱 알림</p>
                    <p className="text-sm text-muted-foreground">브라우저 데스크톱 알림 표시</p>
                  </div>
                  <Switch
                    checked={preferences.desktopEnabled}
                    onCheckedChange={checked => handlePreferenceChange('desktopEnabled', checked)}
                    disabled={!preferences.enabled}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
