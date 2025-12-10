/**
 * Permission Gate Component
 * Conditionally renders children based on user permissions
 */

import type { ReactNode } from 'react';

import { useOrganization, type Permission } from '@/shared/lib/organization';

interface PermissionGateProps {
  /**
   * Required permission(s). Can be a single permission or array of permissions.
   */
  permission: Permission | Permission[];

  /**
   * Mode for checking permissions when multiple are provided.
   * - 'any': User needs at least one of the permissions
   * - 'all': User needs all of the permissions
   * @default 'any'
   */
  mode?: 'any' | 'all';

  /**
   * Content to render if user doesn't have permission
   */
  fallback?: ReactNode;

  /**
   * Content to render if user has permission
   */
  children: ReactNode;
}

/**
 * Permission Gate - Renders children only if user has required permission(s)
 *
 * @example
 * // Single permission
 * <PermissionGate permission="business:create">
 *   <Button>Create Business</Button>
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions (any)
 * <PermissionGate permission={['inquiry:reply', 'inquiry:status']} mode="any">
 *   <InquiryActions />
 * </PermissionGate>
 *
 * @example
 * // With fallback
 * <PermissionGate permission="member:invite" fallback={<p>No access</p>}>
 *   <InviteButton />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  mode = 'any',
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useOrganization();

  const permissions = Array.isArray(permission) ? permission : [permission];

  let hasAccess: boolean;
  if (permissions.length === 1) {
    hasAccess = hasPermission(permissions[0]);
  } else {
    hasAccess = mode === 'any' ? hasAnyPermission(permissions) : hasAllPermissions(permissions);
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook version of PermissionGate for more flexibility
 *
 * @example
 * const canCreate = useHasPermission('business:create');
 * if (canCreate) {
 *   // show create button
 * }
 */
export function useHasPermission(permission: Permission): boolean {
  const { hasPermission } = useOrganization();
  return hasPermission(permission);
}

/**
 * Hook to check any of the permissions
 */
export function useHasAnyPermission(permissions: Permission[]): boolean {
  const { hasAnyPermission } = useOrganization();
  return hasAnyPermission(permissions);
}

/**
 * Hook to check all permissions
 */
export function useHasAllPermissions(permissions: Permission[]): boolean {
  const { hasAllPermissions } = useOrganization();
  return hasAllPermissions(permissions);
}
