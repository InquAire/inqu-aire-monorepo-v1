import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@/prisma';

/**
 * Metadata key for roles
 */
export const ROLES_KEY = 'roles';

/**
 * Roles Decorator
 *
 * Use this decorator to restrict endpoint access to specific user roles
 *
 * @example
 * ```typescript
 * @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
 * @Get('admin-only')
 * adminOnlyEndpoint() {
 *   // Only admins and super admins can access this
 * }
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
