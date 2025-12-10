/**
 * App Layout - Layout Widget
 *
 * Main application layout combining sidebar, header, and content area.
 */

import { useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { getNavigationForRole } from '../model/navigation';

import { AppHeader } from './app-header';
import { AppSidebar, type UserProfile } from './app-sidebar';

import { UserRole } from '@/entities/user';
import { BreadcrumbProvider } from '@/shared/lib/breadcrumb';
import { BusinessProvider } from '@/shared/lib/business';
import { OrganizationProvider, type OrganizationMembership } from '@/shared/lib/organization';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  SidebarProvider,
} from '@/shared/ui';

interface AppLayoutProps {
  children: ReactNode;
  profile?: UserProfile;
}

export function AppLayout({ children, profile }: AppLayoutProps) {
  const userRole = (profile?.role as UserRole) ?? UserRole.USER;

  // Convert organizations from profile to OrganizationMembership format
  const organizations: OrganizationMembership[] = (profile?.organizations ?? []).map(org => ({
    organization: {
      id: org.organization.id,
      name: org.organization.name,
      slug: org.organization.slug,
      logo_url: org.organization.logo_url,
    },
    role: org.role as OrganizationMembership['role'],
    permissions: org.permissions || [],
  }));

  return (
    <OrganizationProvider initialOrganizations={organizations}>
      <BusinessProvider>
        <BreadcrumbProvider>
          <LayoutContent profile={profile} userRole={userRole}>
            {children}
          </LayoutContent>
        </BreadcrumbProvider>
      </BusinessProvider>
    </OrganizationProvider>
  );
}

interface LayoutContentProps {
  children: ReactNode;
  profile?: UserProfile;
  userRole: UserRole;
}

function LayoutContent({ children, profile, userRole }: LayoutContentProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navigation = useMemo(() => getNavigationForRole(userRole), [userRole]);

  // Command palette keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(open => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_business_id');
    window.location.href = '/login';
  };

  const handleNavigation = (href: string) => {
    navigate({ to: href });
    setOpen(false);
  };

  return (
    <SidebarProvider>
      {/* Command Palette */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="페이지 검색 또는 명령 실행..." />
        <CommandList>
          <CommandEmpty>결과가 없습니다.</CommandEmpty>
          <CommandGroup heading="페이지">
            {navigation.map(item => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.href} onSelect={() => handleNavigation(item.href)}>
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.name}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="액션">
            <CommandItem onSelect={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>로그아웃</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Sidebar */}
      <AppSidebar profile={profile} userRole={userRole} />

      {/* Main content */}
      <main className="flex flex-1 flex-col">
        <AppHeader userRole={userRole} onOpenSearch={() => setOpen(true)} />
        <div className="flex flex-1 flex-col overflow-auto">{children}</div>
      </main>
    </SidebarProvider>
  );
}
