/**
 * Payment Entity - Mutation Hook: useConfirmPayment
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { paymentApi } from '../../api/paymentApi';
import { paymentKeys } from '../../model/constants';

interface ConfirmPaymentParams {
  id: string;
  paymentKey: string;
  businessId: string;
}

/**
 * 결제 확인 Hook (PG사 결제 완료 후 호출)
 */
export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, paymentKey }: ConfirmPaymentParams) => paymentApi.confirm(id, paymentKey),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: paymentKeys.detail(variables.id) });
      queryClient.invalidateQueries({
        queryKey: paymentKeys.list({ business_id: variables.businessId }),
      });
      queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
    },
  });
}
