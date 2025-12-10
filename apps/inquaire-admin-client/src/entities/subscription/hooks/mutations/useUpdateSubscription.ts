/**
 * Subscription Entity - Mutation Hook: useUpdateSubscription
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { subscriptionApi } from '../../api/subscriptionApi';
import { subscriptionKeys } from '../../model/constants';
import type { UpdateSubscriptionRequest } from '../../model/types';

/**
 * 구독 업데이트 Hook
 */
export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSubscriptionRequest }) =>
      subscriptionApi.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.detail(variables.id) });
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.business(data.business_id),
      });
    },
  });
}
