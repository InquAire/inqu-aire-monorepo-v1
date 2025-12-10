/**
 * Payment Entity - Types
 * FSD Entities Layer
 */

// ============================================
// Enums
// ============================================

export enum PaymentMethod {
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  VIRTUAL_ACCOUNT = 'VIRTUAL_ACCOUNT',
  MOBILE_PHONE = 'MOBILE_PHONE',
  GIFT_CERTIFICATE = 'GIFT_CERTIFICATE',
  EASY_PAY = 'EASY_PAY',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// ============================================
// Core Types
// ============================================

export interface Payment {
  id: string;
  business_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string | null;
  payment_key: string | null;
  paid_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Request/Response Types
// ============================================

export interface CreatePaymentRequest {
  business_id: string;
  subscription_id?: string;
  amount: number;
  payment_method: string;
}

export interface PaymentHistory {
  payments: Payment[];
  total_paid: number;
  last_payment: Payment | null;
}

export interface ProcessPaymentRequest {
  payment_id: string;
  payment_key: string;
}

/**
 * 결제 목록 조회 파라미터
 */
export interface QueryPaymentParams {
  business_id?: string;
  status?: PaymentStatus;
  limit?: number;
  offset?: number;
}

/**
 * 결제 업데이트 요청
 */
export interface UpdatePaymentRequest {
  status?: PaymentStatus;
  payment_method?: string;
  payment_key?: string;
  failure_reason?: string;
}

/**
 * 결제 통계
 */
export interface PaymentStats {
  total: number;
  total_amount: number;
  by_status: Record<PaymentStatus, number>;
  by_method: Record<string, number>;
  completed_count: number;
  pending_count: number;
  failed_count: number;
  refunded_amount: number;
}
