/**
 * Payment Entity - Mutation Hook: useCreatePayment
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { paymentApi } from '../../api/paymentApi';
import { paymentKeys } from '../../model/constants';
import type { CreatePaymentRequest } from '../../model/types';

/**
 * 결제 생성 Hook
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentRequest) => paymentApi.create(data),
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: paymentKeys.list({ business_id: data.business_id }),
      });
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
    },
  });
}
