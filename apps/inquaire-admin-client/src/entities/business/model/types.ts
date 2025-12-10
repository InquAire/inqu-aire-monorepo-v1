/**
 * Business Entity - Types
 * FSD Entities Layer
 */

// ============================================
// Enums
// ============================================

export enum IndustryType {
  HOSPITAL = 'HOSPITAL',
  DENTAL = 'DENTAL',
  DERMATOLOGY = 'DERMATOLOGY',
  PLASTIC_SURGERY = 'PLASTIC_SURGERY',
  REAL_ESTATE = 'REAL_ESTATE',
  BEAUTY_SALON = 'BEAUTY_SALON',
  ACADEMY = 'ACADEMY',
  LAW_FIRM = 'LAW_FIRM',
  OTHER = 'OTHER',
}

// Subscription enums moved to subscription entity
export { SubscriptionPlan, SubscriptionStatus } from '../../subscription/model/types';

// ============================================
// Core Types
// ============================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Business {
  id: string;
  organization_id: string;
  name: string;
  industry_type: IndustryType;
  address: string | null;
  phone: string | null;
  website: string | null;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  organization?: Organization;
  _count?: {
    channels: number;
    customers: number;
    inquiries: number;
  };
}

// ============================================
// Request/Response Types
// ============================================

export interface CreateBusinessRequest {
  organization_id: string;
  name: string;
  industry_type: IndustryType;
  address?: string;
  phone?: string;
  website?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateBusinessRequest {
  name?: string;
  industry_type?: IndustryType;
  address?: string;
  phone?: string;
  website?: string;
  settings?: Record<string, unknown>;
}

export interface BusinessListFilters {
  limit?: number;
  search?: string;
  userId?: string;
  organizationId?: string;
}

export interface BusinessDashboard {
  business_id: string;
  summary: {
    total_inquiries: number;
    today_inquiries: number;
    last_7_days_inquiries: number;
    last_30_days_inquiries: number;
    total_customers: number;
    new_customers_last_7_days: number;
  };
  inquiries_by_status: Array<{
    status: string;
    count: number;
  }>;
  inquiries_by_sentiment: Array<{
    sentiment: string | null;
    count: number;
  }>;
  top_channels: Array<{
    channel_id: string;
    channel_name: string;
    platform: string;
    count: number;
  }>;
}
