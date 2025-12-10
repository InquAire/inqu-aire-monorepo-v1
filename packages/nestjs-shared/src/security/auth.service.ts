import { Injectable } from '@nestjs/common';

import { JwtPayload } from './jwt-payload';

@Injectable()
export class AuthService {
  validatePayload(payload: JwtPayload): boolean {
    return !!(payload.sub && payload.exp && payload.exp > Date.now() / 1000);
  }

  extractUserId(payload: JwtPayload): string {
    return payload.sub;
  }

  extractRole(payload: JwtPayload): string | undefined {
    return payload.role;
  }
}
