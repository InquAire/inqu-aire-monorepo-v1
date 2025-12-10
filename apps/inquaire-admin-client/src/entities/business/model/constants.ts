/**
 * Business Entity - Constants
 * FSD Entities Layer
 */

/**
 * Query Keys
 */
export const businessKeys = {
  all: ['businesses'] as const,
  lists: () => [...businessKeys.all, 'list'] as const,
  list: (userId?: string, organizationId?: string) =>
    [...businessKeys.lists(), { userId, organizationId }] as const,
  details: () => [...businessKeys.all, 'detail'] as const,
  detail: (id: string) => [...businessKeys.details(), id] as const,
  dashboard: (id: string) => [...businessKeys.all, 'dashboard', id] as const,
};
