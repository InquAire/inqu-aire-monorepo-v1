import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthUser } from '../types/auth';

type Role = AuthUser['roles'][number];
const ROLE_VALUES: Role[] = ['PUBLIC', 'USER', 'ADMIN'];
const ROLE_SET = new Set<Role>(ROLE_VALUES);

function normalizeRoles(input: unknown): Role[] {
  if (!Array.isArray(input)) return [];
  // 문자열/대소문자 섞여 들어오는 케이스 방어
  const out: Role[] = [];
  for (const r of input) {
    const v = typeof r === 'string' ? r.toUpperCase().trim() : r;
    if (ROLE_SET.has(v as Role)) out.push(v as Role);
  }
  return out;
}

/**
 * @CurrentUser() — Nest HTTP 컨트롤러에서 인증된 사용자 정보를 주입.
 * - 소스: req.user | req.authUser | req.currentUser
 * - roles: 허용된 리터럴('PUBLIC' | 'CUSTOMER' | 'ADMIN')만 반환(Role[])
 * - deviceId, locale: 헤더 폴백
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser; authUser?: AuthUser; currentUser?: AuthUser }>();
    const raw = req?.user ?? req?.authUser ?? req?.currentUser;
    if (!raw) {
      return undefined;
    }

    const id = raw.id != null ? String(raw.id) : undefined;
    if (!id) {
      return undefined;
    }

    const roles = normalizeRoles(raw.roles);
    const deviceId = raw.deviceId ?? (req?.headers?.['x-device-id'] as string | undefined);
    const acceptLang = (req?.headers?.['accept-language'] as string | undefined) ?? raw.locale;
    const locale = typeof acceptLang === 'string' ? acceptLang.split(',')[0] : undefined;

    const user: AuthUser = { id, sub: id, roles, deviceId, locale };
    return user;
  }
);

/** 가드/인터셉터에서 편하게 꺼내 쓰는 헬퍼 */
export function getCurrentUser(ctx: ExecutionContext): AuthUser | undefined {
  const req = ctx
    .switchToHttp()
    .getRequest<Request & { user?: AuthUser; authUser?: AuthUser; currentUser?: AuthUser }>();
  const raw = req?.user ?? req?.authUser ?? req?.currentUser;
  if (!raw) {
    return undefined;
  }
  const id = raw.id != null ? String(raw.id) : undefined;
  if (!id) {
    return undefined;
  }
  const roles = normalizeRoles(raw.roles);
  const deviceId = raw.deviceId ?? (req?.headers?.['x-device-id'] as string | undefined);
  const acceptLang = (req?.headers?.['accept-language'] as string | undefined) ?? raw.locale;
  const locale = typeof acceptLang === 'string' ? acceptLang.split(',')[0] : undefined;
  return { id, sub: id, roles, deviceId, locale };
}
