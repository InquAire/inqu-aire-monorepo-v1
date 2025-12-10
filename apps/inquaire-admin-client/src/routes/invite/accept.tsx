/**
 * Invite Accept Page
 * 조직 초대 수락 페이지
 */
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Building2, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { organizationApi, organizationKeys } from '@/entities/organization';
import { isTokenExpired } from '@/shared/lib/auth/tokenManager';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui';

interface AcceptSearchParams {
  token?: string;
}

export const Route = createFileRoute('/invite/accept')({
  validateSearch: (search: Record<string, unknown>): AcceptSearchParams => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  component: InviteAcceptPage,
});

type AcceptStatus = 'idle' | 'loading' | 'success' | 'error' | 'login-required';

interface AcceptResult {
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  error?: string;
}

/**
 * 인증 상태 확인 (localStorage 직접 체크)
 */
function checkAuthentication(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('access_token');
  return !!token && !isTokenExpired(0);
}

function InviteAcceptPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = Route.useSearch();

  const [status, setStatus] = useState<AcceptStatus>('idle');
  const [result, setResult] = useState<AcceptResult>({});

  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === 'undefined') return;

    const isAuthenticated = checkAuthentication();

    if (!token) {
      setStatus('error');
      setResult({ error: '초대 토큰이 없습니다.' });
      return;
    }

    if (!isAuthenticated) {
      setStatus('login-required');
      return;
    }

    // 초대 수락 시도
    const acceptInvitation = async () => {
      setStatus('loading');
      try {
        const response = await organizationApi.acceptInvitation(token);
        // 조직 목록 캐시 무효화
        await queryClient.invalidateQueries({ queryKey: organizationKeys.all });
        setStatus('success');
        setResult({ organization: response.organization });
      } catch (error) {
        setStatus('error');
        const errorMessage = error instanceof Error ? error.message : '초대 수락에 실패했습니다.';
        setResult({ error: errorMessage });
      }
    };

    acceptInvitation();
  }, [token, queryClient]);

  const handleLogin = () => {
    // 로그인 후 다시 이 페이지로 돌아오도록 redirect 설정
    navigate({
      to: '/login',
      search: { redirect: `/invite/accept?token=${token}` },
    });
  };

  const handleGoToOrganization = () => {
    if (result.organization) {
      // 페이지 새로고침으로 조직 컨텍스트 갱신
      window.location.href = '/dashboard';
    }
  };

  const handleGoHome = () => {
    navigate({ to: '/' });
  };

  if (status === 'idle') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">로딩 중...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">조직 초대</CardTitle>
          <CardDescription>
            {status === 'login-required' && '초대를 수락하려면 로그인이 필요합니다.'}
            {status === 'loading' && '초대를 처리하고 있습니다...'}
            {status === 'success' && '초대가 성공적으로 수락되었습니다!'}
            {status === 'error' && '초대 수락에 실패했습니다.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {status === 'login-required' && (
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                이메일로 받으신 초대를 수락하려면 먼저 로그인해주세요.
                <br />
                계정이 없으시면 회원가입 후 다시 시도해주세요.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={handleLogin} className="w-full">
                  로그인하러 가기
                </Button>
                <Button variant="outline" onClick={handleGoHome} className="w-full">
                  홈으로
                </Button>
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">잠시만 기다려주세요...</p>
            </div>
          )}

          {status === 'success' && result.organization && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <div className="text-center">
                  <p className="font-semibold text-lg">{result.organization.name}</p>
                  <p className="text-sm text-muted-foreground">조직에 가입되었습니다</p>
                </div>
              </div>
              <Button onClick={handleGoToOrganization} className="w-full">
                조직으로 이동
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4">
                <XCircle className="h-12 w-12 text-destructive" />
                <p className="text-sm text-destructive text-center">{result.error}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={handleGoHome} className="w-full">
                  홈으로
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
