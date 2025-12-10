/**
 * Subscription Entity - Mutation Hook: useCreateSubscription
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { subscriptionApi } from '../../api/subscriptionApi';
import { subscriptionKeys } from '../../model/constants';
import type { CreateSubscriptionRequest } from '../../model/types';

/**
 * 구독 생성 Hook
 */
export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSubscriptionRequest) => subscriptionApi.create(data),
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.business(data.business_id),
      });
    },
  });
}
