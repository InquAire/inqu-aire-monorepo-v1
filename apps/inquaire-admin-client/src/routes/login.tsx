import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { HelpCircle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useLogin } from '@/entities/auth';
import { apiClient } from '@/shared/api/client';
import { isTokenExpired } from '@/shared/lib/auth/tokenManager';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@/shared/ui';

interface LoginSearchParams {
  redirect?: string;
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearchParams => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: ({ search }) => {
    console.log('[login] beforeLoad called');

    // SSR 환경에서는 체크하지 않음
    if (typeof window === 'undefined') {
      console.log('[login] SSR environment, skipping auth check');
      return;
    }

    // 이미 로그인되어 있으면 대시보드 또는 redirect 경로로 리다이렉트
    const token = localStorage.getItem('access_token');
    if (token && !isTokenExpired(0)) {
      console.log('[login] Already authenticated, redirecting');
      const redirectTo = (search as LoginSearchParams).redirect || '/dashboard';
      throw redirect({ to: redirectTo });
    }

    console.log('[login] Not authenticated, showing login page');
  },
  component: LoginPage,
});

// Login form validation schema
const loginSchema = z.object({
  email: z.string().email({ message: '올바른 이메일 주소를 입력해주세요.' }),
  password: z.string().min(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' }),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: redirectPath } = Route.useSearch();
  const loginMutation = useLogin();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await loginMutation.mutateAsync(data);

      console.log('[Login] Login response:', {
        hasAccessToken: !!response.access_token,
        hasRefreshToken: !!response.refresh_token,
        expiresIn: response.expires_in,
        user: response.user,
      });

      // Save tokens to localStorage (with expiry)
      // Note: authApi.login already saves tokens, but we do it again to ensure
      apiClient.setToken(response.access_token, response.refresh_token, response.expires_in);

      console.log('[Login] Tokens saved, verifying...');

      // Verify tokens are saved
      const savedToken = localStorage.getItem('access_token');
      const savedExpiry = localStorage.getItem('token_expiry');
      console.log('[Login] Verification:', {
        tokenSaved: !!savedToken,
        expirySaved: !!savedExpiry,
        expiryDate: savedExpiry ? new Date(parseInt(savedExpiry)).toISOString() : null,
      });

      // Show success message
      toast.success('로그인 성공', {
        description: `환영합니다, ${response.user.name}님!`,
      });

      // Small delay to ensure localStorage is flushed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Navigate to redirect path or dashboard
      const targetPath = redirectPath || '/dashboard';
      console.log(`[Login] Navigating to ${targetPath}...`);

      await navigate({ to: targetPath });
    } catch (error) {
      // Error handling
      const errorMessage = error instanceof Error ? error.message : '로그인에 실패했습니다.';
      toast.error('로그인 실패', {
        description: errorMessage,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-slate-50">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-linear-to-br from-blue-100/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-linear-to-tr from-slate-100/30 to-transparent rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 text-center">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
              <HelpCircle className="h-10 w-10 text-white" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold">InquAire</CardTitle>
            <CardDescription className="text-base">관리자 로그인</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이메일</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@example.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비밀번호</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    로그인 중...
                  </>
                ) : (
                  '로그인'
                )}
              </Button>
            </form>
          </Form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>문제가 있으신가요?</p>
            <button className="text-primary hover:underline mt-1">관리자에게 문의하기</button>
          </div>
        </CardContent>
      </Card>

      {/* Version info */}
      <div className="absolute bottom-4 right-4 text-xs text-muted-foreground">
        InquAire Admin v1.0.0
      </div>
    </div>
  );
}
