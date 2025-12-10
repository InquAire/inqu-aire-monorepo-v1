/**
 * Payment Entity - Query Hook: usePayments
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { paymentApi } from '../../api/paymentApi';
import { paymentKeys } from '../../model/constants';
import type { QueryPaymentParams } from '../../model/types';

/**
 * 결제 목록 조회 Hook
 */
export function usePayments(params?: QueryPaymentParams) {
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => paymentApi.list(params),
  });
}

/**
 * 비즈니스별 결제 이력 조회 Hook
 */
export function usePaymentsByBusiness(businessId: string) {
  return useQuery({
    queryKey: paymentKeys.list({ business_id: businessId }),
    queryFn: () => paymentApi.getHistory(businessId),
    enabled: !!businessId,
  });
}
