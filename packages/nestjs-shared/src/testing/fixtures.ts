import type { JwtPayload } from '../security/jwt-payload';
import type { Role } from '../types/auth';

export interface TestUser {
  id: string;
  email: string;
  roles: Role[];
  deviceId?: string;
  locale?: string;
}

export interface TestAuthHeaders {
  authorization?: string;
  'x-request-id'?: string;
}

export function makeJwtPayload(user: TestUser): JwtPayload {
  return {
    sub: user.id,
    role: user.roles[0], // Take first role
    email: user.email,
  };
}
