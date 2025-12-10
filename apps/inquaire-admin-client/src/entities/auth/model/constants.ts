/**
 * Auth Entity - Constants
 * FSD Entities Layer
 */

/**
 * Query Keys
 */
export const authKeys = {
  all: ['auth'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
};
