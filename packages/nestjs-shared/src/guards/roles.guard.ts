import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../types/auth';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles || roles.length === 0) return true; // 역할 지정 없으면 통과
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { role?: string | Role; roles?: Role[] } | undefined;
    if (!user) return false;

    // roles 배열이 있으면 그것을 확인
    if (user.roles && Array.isArray(user.roles)) {
      const userRolesUpper = user.roles.map(r => String(r).toUpperCase() as Role);
      const requiredRolesUpper = roles.map(r => String(r).toUpperCase() as Role);
      return requiredRolesUpper.some(required => userRolesUpper.includes(required));
    }

    // role 필드가 있으면 그것을 확인
    if (user.role) {
      const userRoleUpper = String(user.role).toUpperCase() as Role;
      const requiredRolesUpper = roles.map(r => String(r).toUpperCase() as Role);
      return requiredRolesUpper.includes(userRoleUpper);
    }

    return false;
  }
}
