/**
 * AI Entity - Types
 * FSD Entities Layer
 */

import type { IndustryType } from '../../business/model/types';

// ============================================
// Enums
// ============================================

export enum Sentiment {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
}

export enum Urgency {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// ============================================
// Core Types
// ============================================

export interface ExtractedInfoHospital {
  desired_date?: string;
  desired_time?: string;
  treatment_name?: string;
  concern?: string;
  customer_name?: string;
  contact?: string;
  age?: string;
  additional_info?: string;
}

export interface ExtractedInfoRealEstate {
  property_type?: string;
  location?: string;
  budget?: string;
  desired_date?: string;
  rooms?: string;
  customer_name?: string;
  contact?: string;
  additional_requirements?: string;
}

export interface AnalysisResult {
  type: string;
  summary: string;
  extracted_info: ExtractedInfoHospital | ExtractedInfoRealEstate | Record<string, unknown>;
  sentiment: Sentiment;
  urgency: Urgency;
  suggested_reply: string;
  confidence: number; // 0-1
}

// ============================================
// Request/Response Types
// ============================================

export interface AnalyzeInquiryRequest {
  message: string;
  industryType: IndustryType;
  context?: string;
}

export interface GenerateReplyRequest {
  message: string;
  industryType: IndustryType;
  context?: string;
}

export interface GenerateReplyResponse {
  reply: string;
}

export interface ClassifyRequest {
  message: string;
}

export interface ClassifyResponse {
  classification: string;
}
