/**
 * Inquiry Entity - Public API
 * FSD Entities Layer
 */

// Types
export type {
  CreateInquiryRequest,
  GetStatsQueryParams,
  Inquiry,
  InquiryReply,
  InquiryStats,
  QueryInquiryParams,
  UpdateInquiryRequest,
} from './model/types';

export { InquiryStatus, SenderType } from './model/types';

// Constants
export { inquiryKeys } from './model/constants';

// API
export { inquiryApi } from './api/inquiryApi';

// Query Hooks
export { useInquiries } from './hooks/queries/useInquiries';
export { useInquiry } from './hooks/queries/useInquiry';
export { useInquiryStats } from './hooks/queries/useInquiryStats';

// Mutation Hooks
export { useAnalyzeInquiry } from './hooks/mutations/useAnalyzeInquiry';
export { useCreateInquiry } from './hooks/mutations/useCreateInquiry';
export { useDeleteInquiry } from './hooks/mutations/useDeleteInquiry';
export { useUpdateInquiry } from './hooks/mutations/useUpdateInquiry';
