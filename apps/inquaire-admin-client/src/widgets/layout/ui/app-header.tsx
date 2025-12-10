/**
 * App Header - Layout Widget
 *
 * Top header with breadcrumb, search, and utility buttons.
 */

import { Link } from '@tanstack/react-router';
import { Building2, HelpCircle, Home, Search } from 'lucide-react';

import { getNavigationForRole } from '../model/navigation';

import { UserRole } from '@/entities/user';
import { useBreadcrumb } from '@/shared/lib/breadcrumb';
import { useBusinessContext } from '@/shared/lib/business';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  LanguageSwitcher,
  MobileNav,
  NotificationCenter,
  Separator,
  SidebarTrigger,
  ThemeToggle,
} from '@/shared/ui';

interface AppHeaderProps {
  userRole: UserRole;
  onOpenSearch: () => void;
}

export function AppHeader({ userRole, onOpenSearch }: AppHeaderProps) {
  const { currentBusiness } = useBusinessContext();
  const { breadcrumbs } = useBreadcrumb();
  const navigation = getNavigationForRole(userRole);
  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <MobileNav
        items={navigation}
        title={currentBusiness?.name ?? 'InquAire'}
        logo={
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            {isAdmin ? <HelpCircle className="size-4" /> : <Building2 className="size-4" />}
          </div>
        }
      />
      <SidebarTrigger className="-ml-1 hidden md:flex" />
      <Separator orientation="vertical" className="mr-2 h-4 hidden md:flex" />

      {/* Breadcrumb */}
      {breadcrumbs.length > 0 && (
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard">
                  <Home className="h-4 w-4" />
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <BreadcrumbItem key={index}>
                  {isLast ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <>
                      <BreadcrumbLink asChild>
                        <Link to={item.href || '#'}>{item.label}</Link>
                      </BreadcrumbLink>
                      <BreadcrumbSeparator />
                    </>
                  )}
                </BreadcrumbItem>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
        <NotificationCenter />
        <Button variant="outline" size="sm" onClick={onOpenSearch} className="gap-2 hidden sm:flex">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline-flex">검색...</span>
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
        <Button variant="outline" size="icon" onClick={onOpenSearch} className="sm:hidden">
          <Search className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
