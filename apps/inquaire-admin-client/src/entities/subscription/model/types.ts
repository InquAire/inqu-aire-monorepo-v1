/**
 * Subscription Entity - Types
 * FSD Entities Layer
 */

// ============================================
// Enums
// ============================================

export enum SubscriptionPlan {
  TRIAL = 'TRIAL',
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED',
}

// ============================================
// Core Types
// ============================================

export interface Subscription {
  id: string;
  business_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  monthly_limit: number;
  current_usage: number;
  billing_cycle_start: string;
  billing_cycle_end: string;
  trial_ends_at: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Request/Response Types
// ============================================

export interface CreateSubscriptionRequest {
  business_id: string;
  plan: SubscriptionPlan;
}

export interface UpdateSubscriptionRequest {
  plan?: SubscriptionPlan;
  status?: SubscriptionStatus;
}

export interface SubscriptionUsage {
  subscription: Subscription;
  usage_percentage: number;
  remaining: number;
  days_remaining: number;
}

/**
 * 구독 목록 조회 파라미터
 */
export interface QuerySubscriptionParams {
  status?: SubscriptionStatus;
  plan?: SubscriptionPlan;
  limit?: number;
  offset?: number;
}

/**
 * 구독 통계
 */
export interface SubscriptionStats {
  total: number;
  by_status: Record<SubscriptionStatus, number>;
  by_plan: Record<SubscriptionPlan, number>;
  active_count: number;
  trial_count: number;
  canceled_count: number;
  expiring_soon: number;
}
