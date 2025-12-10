/**
 * Webhook Entity - Query Hook: useWebhookEvents
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { webhookApi } from '../../api/webhookApi';
import { webhookKeys } from '../../model/constants';
import type { QueryWebhookEventParams } from '../../model/types';

/**
 * 웹훅 이벤트 목록 조회 Hook
 */
export function useWebhookEvents(params?: QueryWebhookEventParams) {
  return useQuery({
    queryKey: webhookKeys.list(params),
    queryFn: () => webhookApi.list(params),
  });
}

/**
 * 채널별 웹훅 이벤트 목록 조회 Hook
 */
export function useWebhookEventsByChannel(channelId: string) {
  return useQuery({
    queryKey: webhookKeys.list({ channel_id: channelId }),
    queryFn: () => webhookApi.list({ channel_id: channelId }),
    enabled: !!channelId,
  });
}
