/**
 * App Sidebar - Layout Widget
 *
 * Main navigation sidebar with organization/business selection.
 */

import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  LogOut,
  Settings,
} from 'lucide-react';
import { useMemo } from 'react';

import { getNavigationGroupsForRole } from '../model/navigation';

import { UserRole } from '@/entities/user';
import { useBusinessContext } from '@/shared/lib/business';
import { useOrganization } from '@/shared/lib/organization';
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/shared/ui';
import { OrganizationSwitcher } from '@/shared/ui/organization-switcher';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  organizations?: Array<{
    organization: { id: string; name: string; slug: string; logo_url?: string | null };
    role: string;
    permissions: string[];
  }>;
}

interface AppSidebarProps {
  profile?: UserProfile;
  userRole: UserRole;
}

export function AppSidebar({ profile, userRole }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { businesses, currentBusiness, setCurrentBusiness, hasMultipleBusinesses } =
    useBusinessContext();
  const { organizations } = useOrganization();

  const navigationGroups = useMemo(() => getNavigationGroupsForRole(userRole), [userRole]);
  const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

  const userInitials = useMemo(() => {
    if (!profile?.name) return 'U';
    return profile.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [profile?.name]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_business_id');
    window.location.href = '/login';
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {organizations.length > 0 ? (
              <div className="px-2 py-2">
                <OrganizationSwitcher className="w-full" />
              </div>
            ) : !isAdmin && businesses.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Building2 className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {currentBusiness?.name ?? '사업체 선택'}
                      </span>
                      <span className="truncate text-xs">
                        {currentBusiness?.industry_type ?? ''}
                      </span>
                    </div>
                    {hasMultipleBusinesses && <ChevronDown className="ml-auto" />}
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                {hasMultipleBusinesses && (
                  <DropdownMenuContent
                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                    align="start"
                    side="bottom"
                    sideOffset={4}
                  >
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      사업체 선택
                    </DropdownMenuLabel>
                    {businesses.map(business => (
                      <DropdownMenuItem
                        key={business.id}
                        onClick={() => setCurrentBusiness(business)}
                        className="gap-2"
                      >
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                          <Building2 className="size-4" />
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">{business.name}</span>
                          <span className="truncate text-xs">{business.industry_type}</span>
                        </div>
                        {currentBusiness?.id === business.id && (
                          <Check className="size-4 text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                )}
              </DropdownMenu>
            ) : (
              <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <HelpCircle className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">InquAire</span>
                  <span className="truncate text-xs">Admin Portal</span>
                </div>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navigationGroups.map(group => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;

                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                        <Link to={item.href}>
                          <Icon />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{profile?.name ?? 'User'}</span>
                    <span className="truncate text-xs">{profile?.email ?? ''}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{profile?.name ?? 'User'}</span>
                      <span className="truncate text-xs">{profile?.email ?? ''}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: '/settings' })}>
                  <Settings className="mr-2 h-4 w-4" />
                  설정
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
