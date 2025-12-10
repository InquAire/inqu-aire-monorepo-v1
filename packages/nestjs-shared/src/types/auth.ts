import type { Request } from 'express';

import type { EntityId } from './common';

export type Role = 'PUBLIC' | 'USER' | 'ADMIN' | 'DEVELOPER';

export interface AuthUser {
  id: EntityId;
  sub: EntityId; // JWT subject (same as id)
  roles: Role[];
  deviceId?: string;
  locale?: string;
}

export interface AuthRequest extends Request {
  user: AuthUser;
}
