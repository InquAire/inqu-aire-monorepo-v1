/**
 * Payment Entity - Constants
 * FSD Entities Layer
 */

import type { QueryPaymentParams } from './types';

/**
 * Query Keys
 */
export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (params?: QueryPaymentParams) => [...paymentKeys.lists(), params] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
  stats: () => [...paymentKeys.all, 'stats'] as const,
};
