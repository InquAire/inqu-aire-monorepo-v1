import { createFileRoute, redirect } from '@tanstack/react-router';

import { isTokenExpired } from '@/shared/lib/auth/tokenManager';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    console.log('[index] beforeLoad called');

    // SSR 환경에서는 로그인으로
    if (typeof window === 'undefined') {
      console.log('[index] SSR environment, redirecting to login');
      throw redirect({ to: '/login' });
    }

    // Check if user is authenticated
    const token = localStorage.getItem('access_token');

    console.log('[index] Token check:', { hasToken: !!token });

    // 버퍼를 0으로 설정하여 실제로 만료된 토큰만 체크
    if (token && !isTokenExpired(0)) {
      console.log('[index] Authenticated, redirecting to dashboard');
      // If authenticated, redirect to dashboard
      throw redirect({ to: '/dashboard' });
    } else {
      console.log('[index] Not authenticated, redirecting to login');
      // If not authenticated or expired, redirect to login
      throw redirect({ to: '/login' });
    }
  },
});
