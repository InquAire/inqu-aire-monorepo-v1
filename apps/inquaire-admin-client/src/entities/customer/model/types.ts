/**
 * Customer Entity - Types
 * FSD Entities Layer
 */

// ============================================
// Enums
// ============================================

export enum PlatformType {
  KAKAO = 'KAKAO',
  LINE = 'LINE',
  INSTAGRAM = 'INSTAGRAM',
  NAVER_TALK = 'NAVER_TALK',
  WEB_CHAT = 'WEB_CHAT',
}

// ============================================
// Core Types
// ============================================

export interface Customer {
  id: string;
  business_id: string;
  platform_user_id: string;
  platform: PlatformType;
  name: string | null;
  phone: string | null;
  email: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  first_contact: string | null;
  last_contact: string | null;
  inquiry_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ============================================
// Request/Response Types
// ============================================

export interface CreateCustomerRequest {
  business_id: string;
  platform_user_id: string;
  platform: PlatformType;
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateCustomerRequest {
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface QueryCustomerParams {
  business_id?: string;
  platform?: PlatformType;
  search?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerStats {
  total_customers: number;
  new_this_month: number;
  top_customers: Array<{
    customer: Customer;
    inquiry_count: number;
  }>;
}
