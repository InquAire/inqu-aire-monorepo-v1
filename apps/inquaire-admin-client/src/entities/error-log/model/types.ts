/**
 * Error Log Entity - Types
 * FSD Entities Layer
 */

// ============================================
// Core Types
// ============================================

export interface ErrorLog {
  id: string;
  user_id: string | null;
  error_type: string;
  error_code: string | null;
  error_message: string;
  stack_trace: string | null;
  context: Record<string, unknown> | null;
  resolved: boolean;
  resolved_at: string | null;
  occurred_at: string;
}

// ============================================
// Request/Response Types
// ============================================

/**
 * 에러 로그 목록 조회 파라미터
 */
export interface QueryErrorLogParams {
  error_type?: string;
  resolved?: boolean;
  user_id?: string;
  page?: number;
  limit?: number;
}

/**
 * 에러 해결 요청
 */
export interface ResolveErrorLogRequest {
  resolved: boolean;
}

/**
 * 에러 로그 통계
 */
export interface ErrorLogStats {
  total: number;
  unresolved: number;
  resolved: number;
  by_type: Record<string, number>;
  recent_errors: ErrorLog[];
}

// ============================================
// Constants
// ============================================

export const ErrorTypeLabels: Record<string, string> = {
  ai_error: 'AI 서비스 에러',
  webhook_error: '웹훅 에러',
  api_error: 'API 에러',
  database_error: '데이터베이스 에러',
  payment_error: '결제 에러',
  auth_error: '인증 에러',
  external_service_error: '외부 서비스 에러',
  validation_error: '유효성 검증 에러',
};
