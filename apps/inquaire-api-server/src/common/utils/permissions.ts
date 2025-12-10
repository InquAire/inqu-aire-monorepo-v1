import { OrganizationRole } from '@/prisma';

/**
 * Organization Permission Types
 */
export type Permission =
  // Organization
  | 'organization:delete'
  | 'organization:settings'
  | 'organization:subscription'
  // Members
  | 'member:invite'
  | 'member:remove'
  | 'member:role'
  // Business
  | 'business:create'
  | 'business:update'
  | 'business:delete'
  // Channel
  | 'channel:manage'
  // Inquiry
  | 'inquiry:view'
  | 'inquiry:reply'
  | 'inquiry:status'
  | 'inquiry:delete'
  // Customer
  | 'customer:view'
  | 'customer:update'
  | 'customer:delete'
  // Template
  | 'template:view'
  | 'template:manage'
  // Stats
  | 'stats:view'
  | 'stats:detailed'
  | 'stats:export';

/**
 * Role-Permission Mapping
 */
const rolePermissions: Record<OrganizationRole, Permission[]> = {
  [OrganizationRole.OWNER]: [
    'organization:delete',
    'organization:settings',
    'organization:subscription',
    'member:invite',
    'member:remove',
    'member:role',
    'business:create',
    'business:update',
    'business:delete',
    'channel:manage',
    'inquiry:view',
    'inquiry:reply',
    'inquiry:status',
    'inquiry:delete',
    'customer:view',
    'customer:update',
    'customer:delete',
    'template:view',
    'template:manage',
    'stats:view',
    'stats:detailed',
    'stats:export',
  ],
  [OrganizationRole.ADMIN]: [
    'organization:settings',
    'organization:subscription',
    'member:invite',
    'member:remove',
    'member:role',
    'business:create',
    'business:update',
    'business:delete',
    'channel:manage',
    'inquiry:view',
    'inquiry:reply',
    'inquiry:status',
    'inquiry:delete',
    'customer:view',
    'customer:update',
    'customer:delete',
    'template:view',
    'template:manage',
    'stats:view',
    'stats:detailed',
    'stats:export',
  ],
  [OrganizationRole.MANAGER]: [
    'business:create',
    'business:update',
    'channel:manage',
    'inquiry:view',
    'inquiry:reply',
    'inquiry:status',
    'inquiry:delete',
    'customer:view',
    'customer:update',
    'customer:delete',
    'template:view',
    'template:manage',
    'stats:view',
    'stats:detailed',
    'stats:export',
  ],
  [OrganizationRole.MEMBER]: [
    'inquiry:view',
    'inquiry:reply',
    'inquiry:status',
    'customer:view',
    'customer:update',
    'template:view',
    'stats:view',
  ],
  [OrganizationRole.VIEWER]: ['inquiry:view', 'customer:view', 'template:view', 'stats:view'],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: OrganizationRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: OrganizationRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: OrganizationRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: OrganizationRole): Permission[] {
  return rolePermissions[role] ?? [];
}

/**
 * Role hierarchy (higher index = more permissions)
 */
const roleHierarchy: OrganizationRole[] = [
  OrganizationRole.VIEWER,
  OrganizationRole.MEMBER,
  OrganizationRole.MANAGER,
  OrganizationRole.ADMIN,
  OrganizationRole.OWNER,
];

/**
 * Check if roleA is higher or equal to roleB in hierarchy
 */
export function isRoleHigherOrEqual(roleA: OrganizationRole, roleB: OrganizationRole): boolean {
  const indexA = roleHierarchy.indexOf(roleA);
  const indexB = roleHierarchy.indexOf(roleB);
  return indexA >= indexB;
}

/**
 * Check if a user can assign a specific role
 * OWNER can assign any role except OWNER to others
 * ADMIN can assign roles below ADMIN
 */
export function canAssignRole(
  currentUserRole: OrganizationRole,
  targetRole: OrganizationRole
): boolean {
  if (currentUserRole === OrganizationRole.OWNER) {
    // Owner can assign any role except OWNER
    return targetRole !== OrganizationRole.OWNER;
  }

  if (currentUserRole === OrganizationRole.ADMIN) {
    // Admin can assign roles below ADMIN
    const adminIndex = roleHierarchy.indexOf(OrganizationRole.ADMIN);
    const targetIndex = roleHierarchy.indexOf(targetRole);
    return targetIndex < adminIndex;
  }

  return false;
}
