/**
 * App Providers - FSD App Layer
 *
 * Composes all application-level providers (QueryClient, Theme, Auth, etc.)
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';

import { createQueryClient } from './query-client';

import { ThemeProvider } from '@/shared/contexts';

const queryClient = createQueryClient();

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
