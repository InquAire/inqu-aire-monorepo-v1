/**
 * Webhook Entity - Types
 * FSD Entities Layer
 */

// ============================================
// Core Types
// ============================================

export interface WebhookEvent {
  id: string;
  channel_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  processed: boolean;
  processed_at: string | null;
  error_message: string | null;
  retry_count: number;
  received_at: string;
}

// ============================================
// Kakao Webhook Types
// ============================================

export interface KakaoUser {
  id: string;
  type: string;
  properties: {
    nickname?: string;
    profile_image?: string;
    plusfriend_user_key?: string;
  };
}

export interface KakaoMessage {
  text: string;
  photo?: {
    url: string;
  };
}

export interface KakaoWebhookDto {
  user: KakaoUser;
  type: string;
  content: KakaoMessage;
  user_key?: string;
}

export interface KakaoWebhookRequest {
  user_key: string;
  type: string;
  content: string;
}

// ============================================
// LINE Webhook Types
// ============================================

export interface LineMessage {
  id: string;
  type: string;
  text?: string;
  timestamp: number;
}

export interface LineSource {
  type: string;
  userId: string;
  groupId?: string;
  roomId?: string;
}

export interface LineEvent {
  type: string;
  message?: LineMessage;
  timestamp: number;
  source: LineSource;
  replyToken: string;
  mode: string;
}

export interface LineWebhookDto {
  destination: string;
  events: LineEvent[];
}

// ============================================
// Request/Response Types
// ============================================

export interface QueryWebhookEventParams {
  channel_id?: string;
  event_type?: string;
  processed?: boolean;
  page?: number;
  limit?: number;
}
