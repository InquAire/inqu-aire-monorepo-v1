/**
 * Channel Entity - API
 * FSD Entities Layer
 */

import type {
  Channel,
  ChannelStats,
  CreateChannelRequest,
  QueryChannelParams,
  UpdateChannelRequest,
} from '../model/types';

import { apiClient } from '@/shared/api/client';

/**
 * 채널 API
 */
export const channelApi = {
  /**
   * 채널 목록 조회
   */
  list: async (params?: QueryChannelParams): Promise<Channel[]> => {
    return apiClient.get<Channel[]>('/channels', { params });
  },

  /**
   * 채널 상세 조회
   */
  get: async (id: string): Promise<Channel> => {
    return apiClient.get<Channel>(`/channels/${id}`);
  },

  /**
   * 채널 생성
   */
  create: async (data: CreateChannelRequest): Promise<Channel> => {
    return apiClient.post<Channel>('/channels', data);
  },

  /**
   * 채널 업데이트
   */
  update: async (id: string, data: UpdateChannelRequest): Promise<Channel> => {
    return apiClient.patch<Channel>(`/channels/${id}`, data);
  },

  /**
   * 채널 삭제
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/channels/${id}`);
  },

  /**
   * 채널 통계 조회
   */
  getStats: async (id: string): Promise<ChannelStats> => {
    return apiClient.get<ChannelStats>(`/channels/${id}/stats`);
  },

  /**
   * 채널 활성화/비활성화
   */
  toggleActive: async (id: string): Promise<Channel> => {
    return apiClient.post<Channel>(`/channels/${id}/toggle-active`);
  },

  /**
   * 자동 응답 활성화/비활성화
   */
  toggleAutoReply: async (id: string): Promise<Channel> => {
    return apiClient.post<Channel>(`/channels/${id}/toggle-auto-reply`);
  },

  /**
   * Webhook URL 재생성
   */
  regenerateWebhookUrl: async (id: string): Promise<Channel> => {
    return apiClient.post<Channel>(`/channels/${id}/regenerate-webhook`);
  },
};
