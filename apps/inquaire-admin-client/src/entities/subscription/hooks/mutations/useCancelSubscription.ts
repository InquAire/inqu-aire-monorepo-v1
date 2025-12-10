/**
 * Subscription Entity - Mutation Hook: useCancelSubscription
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { subscriptionApi } from '../../api/subscriptionApi';
import { subscriptionKeys } from '../../model/constants';

/**
 * 구독 취소 Hook
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => subscriptionApi.cancel(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail(id) });
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.business(data.business_id),
      });
    },
  });
}
