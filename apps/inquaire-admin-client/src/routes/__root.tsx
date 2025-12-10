/**
 * Root Route - TanStack Router
 *
 * Application entry point. Providers are in /app/providers.
 */

import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import appCss from '@/app/styles/app.css?url';

import { Providers } from '@/app';
import '@/shared/lib/i18n/config';
import { CommandPalette, ErrorBoundary, Toaster } from '@/shared/ui';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'InquAire Admin' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
  notFoundComponent: () => (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
    </div>
  ),
});

function RootComponent() {
  return (
    <Providers>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </Providers>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { i18n } = useTranslation();

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(open => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Update html lang attribute (client-side only after hydration)
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    const handleLanguageChange = (lng: string) => {
      document.documentElement.lang = lng;
    };
    i18n.on('languageChanged', handleLanguageChange);
    return () => i18n.off('languageChanged', handleLanguageChange);
  }, [i18n]);

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
        <Toaster />
        <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}
