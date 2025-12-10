/**
 * AI Entity - Public API
 * FSD Entities Layer
 */

// Types
export type {
  AnalysisResult,
  AnalyzeInquiryRequest,
  ClassifyRequest,
  ClassifyResponse,
  ExtractedInfoHospital,
  ExtractedInfoRealEstate,
  GenerateReplyRequest,
  GenerateReplyResponse,
} from './model/types';

export { Sentiment, Urgency } from './model/types';

// API
export { aiApi } from './api/aiApi';

// Mutation Hooks
export { useAnalyzeInquiry } from './hooks/mutations/useAnalyzeInquiry';
export { useClassifyInquiry } from './hooks/mutations/useClassifyInquiry';
export { useGenerateReply } from './hooks/mutations/useGenerateReply';
