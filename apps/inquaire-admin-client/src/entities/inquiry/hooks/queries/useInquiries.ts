/**
 * Inquiry Entity - Query Hook: useInquiries
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { inquiryApi } from '../../api/inquiryApi';
import { inquiryKeys } from '../../model/constants';
import type { QueryInquiryParams } from '../../model/types';

/**
 * 문의 목록 조회 Hook
 */
export function useInquiries(params?: QueryInquiryParams) {
  return useQuery({
    queryKey: inquiryKeys.list(params),
    queryFn: () => inquiryApi.list(params),
  });
}
