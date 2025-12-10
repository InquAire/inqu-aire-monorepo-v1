/**
 * Subscription Entity - Constants
 * FSD Entities Layer
 */

/**
 * Query Keys
 */
export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  details: () => [...subscriptionKeys.all, 'detail'] as const,
  detail: (id: string) => [...subscriptionKeys.details(), id] as const,
  business: (businessId: string) => [...subscriptionKeys.all, 'business', businessId] as const,
  usage: (id: string) => [...subscriptionKeys.all, 'usage', id] as const,
};
