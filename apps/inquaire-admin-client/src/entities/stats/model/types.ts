/**
 * Stats Entity - Types
 * FSD Entities Layer
 */

// ============================================
// Core Types
// ============================================

export interface DailyStats {
  id: string;
  business_id: string;
  date: string;
  total_inquiries: number;
  new_inquiries: number;
  in_progress_inquiries: number;
  completed_inquiries: number;
  on_hold_inquiries: number;
  unique_customers: number;
  avg_response_time: number | null;
  avg_ai_confidence: number | null;
  inquiry_types: Record<string, number> | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Request/Response Types
// ============================================

export interface GetDailyStatsParams {
  business_id: string;
  start_date?: string;
  end_date?: string;
}

export interface StatsResponse {
  stats: DailyStats[];
  summary: {
    total_inquiries: number;
    avg_response_time: number | null;
    avg_ai_confidence: number | null;
    trend: {
      inquiries: number; // % change
      response_time: number; // % change
    };
  };
}
