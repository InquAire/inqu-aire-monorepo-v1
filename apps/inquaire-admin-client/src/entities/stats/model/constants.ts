/**
 * Stats Entity - Constants
 * FSD Entities Layer
 */

import type { GetDailyStatsParams } from './types';

/**
 * Query Keys
 */
export const statsKeys = {
  all: ['stats'] as const,
  daily: (params: GetDailyStatsParams) => [...statsKeys.all, 'daily', params] as const,
};
