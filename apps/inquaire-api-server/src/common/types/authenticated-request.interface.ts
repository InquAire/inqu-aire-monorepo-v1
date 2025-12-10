import type { Request } from 'express';

import type { AuthenticatedUser } from '../../modules/auth/guards/roles.guard';

/**
 * Express Request with authenticated user
 *
 * Used for accessing the authenticated user object added by JwtAuthGuard
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
