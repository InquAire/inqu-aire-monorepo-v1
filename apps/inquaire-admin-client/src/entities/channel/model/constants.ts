/**
 * Channel Entity - Constants
 * FSD Entities Layer
 */

import type { QueryChannelParams } from './types';

/**
 * Query Keys
 */
export const channelKeys = {
  all: ['channels'] as const,
  lists: () => [...channelKeys.all, 'list'] as const,
  list: (params?: QueryChannelParams) => [...channelKeys.lists(), params] as const,
  details: () => [...channelKeys.all, 'detail'] as const,
  detail: (id: string) => [...channelKeys.details(), id] as const,
  stats: (id: string) => [...channelKeys.all, 'stats', id] as const,
};
