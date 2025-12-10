/**
 * Customer Entity - Constants
 * FSD Entities Layer
 */

import type { QueryCustomerParams } from './types';

/**
 * Query Keys
 */
export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (params?: QueryCustomerParams) => [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  stats: (businessId: string) => [...customerKeys.all, 'stats', businessId] as const,
};
