/**
 * Organization Permission Types and Utilities
 */

export type OrganizationRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'VIEWER';

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
  OWNER: [
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
  ADMIN: [
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
  MANAGER: [
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
  MEMBER: [
    'inquiry:view',
    'inquiry:reply',
    'inquiry:status',
    'customer:view',
    'customer:update',
    'template:view',
    'stats:view',
  ],
  VIEWER: ['inquiry:view', 'customer:view', 'template:view', 'stats:view'],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: OrganizationRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return rolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(
  role: OrganizationRole | undefined,
  permissions: Permission[]
): boolean {
  return permissions.some(p => hasPermission(role, p));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(
  role: OrganizationRole | undefined,
  permissions: Permission[]
): boolean {
  return permissions.every(p => hasPermission(role, p));
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: OrganizationRole): Permission[] {
  return rolePermissions[role] ?? [];
}

/**
 * Role display names (Korean)
 */
export const ROLE_DISPLAY_NAMES: Record<OrganizationRole, string> = {
  OWNER: '소유자',
  ADMIN: '관리자',
  MANAGER: '매니저',
  MEMBER: '멤버',
  VIEWER: '뷰어',
};

/**
 * Role descriptions (Korean)
 */
export const ROLE_DESCRIPTIONS: Record<OrganizationRole, string> = {
  OWNER: '모든 권한을 가지며 조직을 삭제할 수 있습니다.',
  ADMIN: '멤버 관리 및 설정을 변경할 수 있습니다.',
  MANAGER: '사업체 관리 및 문의 처리를 할 수 있습니다.',
  MEMBER: '문의 조회 및 답변을 할 수 있습니다.',
  VIEWER: '읽기 전용으로 조회만 할 수 있습니다.',
};
