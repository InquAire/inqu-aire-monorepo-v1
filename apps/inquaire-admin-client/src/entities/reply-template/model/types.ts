/**
 * Reply Template Entity - Types
 * FSD Entities Layer
 */

// ============================================
// Core Types
// ============================================

export interface ReplyTemplate {
  id: string;
  business_id: string;
  name: string;
  type: string | null;
  content: string;
  variables: string[];
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ============================================
// Request/Response Types
// ============================================

export interface CreateReplyTemplateRequest {
  business_id: string;
  name: string;
  type?: string;
  content: string;
  variables?: string[];
  is_active?: boolean;
}

export interface UpdateReplyTemplateRequest {
  name?: string;
  type?: string;
  content?: string;
  variables?: string[];
  is_active?: boolean;
}

export interface QueryReplyTemplateParams {
  business_id?: string;
  type?: string;
  search?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export interface ReplyTemplatesResponse {
  data: ReplyTemplate[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
