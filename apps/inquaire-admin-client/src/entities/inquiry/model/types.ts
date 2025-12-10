/**
 * Inquiry Entity - Types
 * FSD Entities Layer
 */

import type { Channel } from '../../channel/model/types';
import type { Customer } from '../../customer/model/types';

// ============================================
// Enums
// ============================================

export enum InquiryStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
}

export enum SenderType {
  AI = 'AI',
  HUMAN = 'HUMAN',
  SYSTEM = 'SYSTEM',
}

// ============================================
// Core Types
// ============================================

export interface Inquiry {
  id: string;
  business_id: string;
  channel_id: string;
  customer_id: string;
  platform_message_id: string;
  message_text: string;
  type: string | null;
  summary: string | null;
  extracted_info: Record<string, unknown> | null;
  reply_text: string | null;
  status: InquiryStatus;
  sentiment: string | null;
  urgency: string | null;
  ai_confidence: number | null;
  ai_model: string | null;
  ai_processing_time: number | null;
  notes: string | null;
  received_at: string;
  analyzed_at: string | null;
  replied_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relations (populated when needed)
  customer?: Customer;
  channel?: Channel;
  replies?: InquiryReply[];
}

export interface InquiryReply {
  id: string;
  inquiry_id: string;
  message_text: string;
  sender_type: SenderType;
  sender_id: string | null;
  is_sent: boolean;
  sent_at: string | null;
  failed_reason: string | null;
  retry_count: number;
  created_at: string;
}

// ============================================
// Request/Response Types
// ============================================

export interface CreateInquiryRequest {
  business_id: string;
  channel_id: string;
  customer_id: string;
  platform_message_id: string;
  message_text: string;
  received_at?: string;
}

export interface UpdateInquiryRequest {
  reply_text?: string;
  status?: InquiryStatus;
  summary?: string;
  type?: string;
  notes?: string;
  extracted_info?: Record<string, unknown>;
}

export interface QueryInquiryParams {
  business_id?: string;
  channel_id?: string;
  customer_id?: string;
  status?: InquiryStatus;
  search?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InquiryStats {
  business_id: string;
  start_date?: string;
  end_date?: string;
  total_inquiries: number;
  by_status: {
    new: number;
    in_progress: number;
    completed: number;
    on_hold: number;
  };
  by_type: Record<string, number>;
  by_date: Array<{
    date: string;
    count: number;
  }>;
  avg_response_time: number | null;
  avg_ai_confidence: number | null;
}

export interface GetStatsQueryParams {
  business_id: string;
  start_date?: string;
  end_date?: string;
}
