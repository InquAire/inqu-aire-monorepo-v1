/**
 * Payment Entity - Query Hook: usePaymentHistory
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { paymentApi } from '../../api/paymentApi';
import { paymentKeys } from '../../model/constants';

/**
 * 결제 이력 조회 Hook
 */
export function usePaymentHistory(businessId: string) {
  return useQuery({
    queryKey: paymentKeys.list({ business_id: businessId }),
    queryFn: () => paymentApi.getHistory(businessId),
    enabled: !!businessId,
  });
}
