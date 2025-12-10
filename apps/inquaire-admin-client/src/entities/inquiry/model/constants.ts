/**
 * Inquiry Entity - Constants
 * FSD Entities Layer
 */

import type { GetStatsQueryParams, QueryInquiryParams } from './types';

/**
 * Query Keys
 */
export const inquiryKeys = {
  all: ['inquiries'] as const,
  lists: () => [...inquiryKeys.all, 'list'] as const,
  list: (params?: QueryInquiryParams) => [...inquiryKeys.lists(), params] as const,
  details: () => [...inquiryKeys.all, 'detail'] as const,
  detail: (id: string) => [...inquiryKeys.details(), id] as const,
  stats: (params: GetStatsQueryParams) => [...inquiryKeys.all, 'stats', params] as const,
};
