/**
 * Layout Route - TanStack Router
 *
 * Protected layout route. Layout logic is in /widgets/layout.
 */

import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { useProfile } from '@/entities/auth/hooks/queries/useProfile';
import { clearTokens, isTokenExpired } from '@/shared/lib/auth/tokenManager';
import { AppLayout, LayoutSkeleton } from '@/widgets/layout';

export const Route = createFileRoute('/_layout')({
  beforeLoad: ({ location }) => {
    console.log('[_layout] beforeLoad called', { pathname: location.pathname });

    // SSR 환경에서는 체크하지 않음
    if (typeof window === 'undefined') {
      console.log('[_layout] SSR environment, skipping auth check');
      return;
    }

    // Check if user is authenticated
    const token = localStorage.getItem('access_token');
    const tokenExpiry = localStorage.getItem('token_expiry');

    console.log('[_layout] Token check:', {
      hasToken: !!token,
      hasExpiry: !!tokenExpiry,
      tokenPreview: token ? `${token.substring(0, 20)}...` : null,
      expiry: tokenExpiry ? new Date(parseInt(tokenExpiry)).toISOString() : null,
    });

    // 토큰이 없는 경우
    if (!token) {
      console.log('[_layout] No token found, redirecting to login');
      clearTokens();
      throw redirect({ to: '/login' });
    }

    // 토큰 만료 체크 (버퍼 0초)
    const expired = isTokenExpired(0);
    if (expired) {
      console.log('[_layout] Token expired, redirecting to login');
      clearTokens();
      throw redirect({ to: '/login' });
    }

    console.log('[_layout] Authentication successful');
  },
  component: LayoutWrapper,
});

function LayoutWrapper() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading) {
    return <LayoutSkeleton />;
  }

  return (
    <AppLayout profile={profile}>
      <Outlet />
    </AppLayout>
  );
}
