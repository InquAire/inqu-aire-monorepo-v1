/**
 * Inquiry Entity - Query Hook: useInquiry
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { inquiryApi } from '../../api/inquiryApi';
import { inquiryKeys } from '../../model/constants';

/**
 * 문의 상세 조회 Hook
 */
export function useInquiry(id: string) {
  return useQuery({
    queryKey: inquiryKeys.detail(id),
    queryFn: () => inquiryApi.get(id),
    enabled: !!id,
  });
}
