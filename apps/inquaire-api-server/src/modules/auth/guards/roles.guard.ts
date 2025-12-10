import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@/prisma';

import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request.interface';

/**
 * User interface for authenticated requests
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Roles Guard
 *
 * Checks if the authenticated user has the required role(s) to access an endpoint
 *
 * Usage:
 * 1. Apply @Roles() decorator to controller or handler
 * 2. This guard will automatically check if user has required roles
 * 3. If no @Roles() decorator is present, access is granted (no role restriction)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // If no user is authenticated, deny access
    // (This should not happen if JwtAuthGuard is applied globally)
    if (!user) {
      return false;
    }

    // Check if user has any of the required roles
    return requiredRoles.includes(user.role);
  }
}
