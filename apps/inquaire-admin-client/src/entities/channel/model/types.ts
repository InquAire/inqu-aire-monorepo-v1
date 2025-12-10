/**
 * Channel Entity - Types
 * FSD Entities Layer
 */

import type { PlatformType } from '../../customer/model/types';

// Re-export PlatformType for convenience
export { PlatformType } from '../../customer/model/types';

// ============================================
// Core Types
// ============================================

export interface Channel {
  id: string;
  business_id: string;
  platform: PlatformType;
  platform_channel_id: string;
  name: string | null;
  access_token: string | null;
  refresh_token: string | null;
  webhook_url: string | null;
  webhook_secret: string | null;
  auto_reply_enabled: boolean;
  is_active: boolean;
  token_expires_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ============================================
// Request/Response Types
// ============================================

export interface CreateChannelRequest {
  business_id: string;
  platform: PlatformType;
  platform_channel_id: string;
  name?: string;
  access_token?: string;
  refresh_token?: string;
  auto_reply_enabled?: boolean;
}

export interface UpdateChannelRequest {
  name?: string;
  auto_reply_enabled?: boolean;
  is_active?: boolean;
}

export interface QueryChannelParams {
  business_id?: string;
  platform?: PlatformType;
  search?: string;
}

export interface ChannelStats {
  channel: Channel;
  stats: {
    total_inquiries: number;
    today_inquiries: number;
    avg_response_time: number | null;
    last_inquiry_at: string | null;
  };
}
