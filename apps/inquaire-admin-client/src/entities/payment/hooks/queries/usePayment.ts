/**
 * Payment Entity - Query Hook: usePayment
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { paymentApi } from '../../api/paymentApi';
import { paymentKeys } from '../../model/constants';

/**
 * 결제 상세 조회 Hook
 */
export function usePayment(id: string) {
  return useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: () => paymentApi.get(id),
    enabled: !!id,
  });
}
