/**
 * Webhook Entity - Constants
 * FSD Entities Layer
 */

import type { QueryWebhookEventParams } from './types';

/**
 * Query Keys
 */
export const webhookKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhookKeys.all, 'list'] as const,
  list: (params?: QueryWebhookEventParams) => [...webhookKeys.lists(), params] as const,
  details: () => [...webhookKeys.all, 'detail'] as const,
  detail: (id: string) => [...webhookKeys.details(), id] as const,
  stats: () => [...webhookKeys.all, 'stats'] as const,
};
