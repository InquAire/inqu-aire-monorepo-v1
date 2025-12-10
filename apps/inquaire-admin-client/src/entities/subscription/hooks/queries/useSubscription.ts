/**
 * Subscription Entity - Query Hook: useSubscription
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { subscriptionApi } from '../../api/subscriptionApi';
import { subscriptionKeys } from '../../model/constants';

/**
 * 구독 상세 조회 Hook
 */
export function useSubscription(id: string) {
  return useQuery({
    queryKey: subscriptionKeys.detail(id),
    queryFn: () => subscriptionApi.get(id),
    enabled: !!id,
  });
}
