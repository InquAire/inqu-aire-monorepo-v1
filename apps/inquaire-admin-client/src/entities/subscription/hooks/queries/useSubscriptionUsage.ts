/**
 * Subscription Entity - Query Hook: useSubscriptionUsage
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { subscriptionApi } from '../../api/subscriptionApi';
import { subscriptionKeys } from '../../model/constants';

/**
 * 구독 사용량 조회 Hook
 */
export function useSubscriptionUsage(id: string) {
  return useQuery({
    queryKey: subscriptionKeys.usage(id),
    queryFn: () => subscriptionApi.getUsage(id),
    enabled: !!id,
  });
}
