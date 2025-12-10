/**
 * Organization Switcher Component
 * Allows users to switch between organizations they belong to
 */

import { useNavigate } from '@tanstack/react-router';
import { Building2, Check, ChevronsUpDown, Plus, Settings } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

import { ROLE_DISPLAY_NAMES, useOrganization } from '@/shared/lib/organization';

interface OrganizationSwitcherProps {
  className?: string;
  collapsed?: boolean;
}

export function OrganizationSwitcher({ className, collapsed }: OrganizationSwitcherProps) {
  const navigate = useNavigate();
  const { currentOrganization, organizations, switchOrganization, hasPermission } =
    useOrganization();

  if (organizations.length === 0) {
    return (
      <Button
        variant="outline"
        className={className}
        onClick={() => navigate({ to: '/organization/new' })}
      >
        <Plus className="h-4 w-4 mr-2" />
        {!collapsed && '조직 만들기'}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" role="combobox" className={`justify-between ${className}`}>
          <div className="flex items-center gap-2 truncate">
            <Avatar className="h-6 w-6">
              {currentOrganization?.logo_url ? (
                <AvatarImage src={currentOrganization.logo_url} alt={currentOrganization.name} />
              ) : null}
              <AvatarFallback className="text-xs">
                {currentOrganization?.name?.charAt(0)?.toUpperCase() || (
                  <Building2 className="h-3 w-3" />
                )}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <span className="truncate">{currentOrganization?.name || '조직 선택'}</span>
            )}
          </div>
          {!collapsed && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel>내 조직</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map(membership => (
          <DropdownMenuItem
            key={membership.organization.id}
            onClick={() => switchOrganization(membership.organization.id)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Avatar className="h-6 w-6">
              {membership.organization.logo_url ? (
                <AvatarImage
                  src={membership.organization.logo_url}
                  alt={membership.organization.name}
                />
              ) : null}
              <AvatarFallback className="text-xs">
                {membership.organization.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="truncate font-medium">{membership.organization.name}</span>
              <span className="text-xs text-muted-foreground">
                {ROLE_DISPLAY_NAMES[membership.role]}
              </span>
            </div>
            {currentOrganization?.id === membership.organization.id && (
              <Check className="h-4 w-4 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {hasPermission('organization:settings') && currentOrganization && (
          <DropdownMenuItem
            onClick={() => navigate({ to: '/organization/settings' })}
            className="cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            조직 설정
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => navigate({ to: '/organization/new' })}
          className="cursor-pointer"
        >
          <Plus className="mr-2 h-4 w-4" />새 조직 만들기
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
