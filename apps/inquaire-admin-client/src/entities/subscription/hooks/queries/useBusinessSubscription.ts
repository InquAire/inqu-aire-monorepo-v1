/**
 * Subscription Entity - Query Hook: useBusinessSubscription
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { subscriptionApi } from '../../api/subscriptionApi';
import { subscriptionKeys } from '../../model/constants';

/**
 * 비즈니스 구독 조회 Hook
 */
export function useBusinessSubscription(businessId: string) {
  return useQuery({
    queryKey: subscriptionKeys.business(businessId),
    queryFn: () => subscriptionApi.getByBusiness(businessId),
    enabled: !!businessId,
  });
}
