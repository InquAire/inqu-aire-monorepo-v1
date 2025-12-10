/**
 * Webhook Entity - Query Hook: useWebhookEvent
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { webhookApi } from '../../api/webhookApi';
import { webhookKeys } from '../../model/constants';

/**
 * 웹훅 이벤트 상세 조회 Hook
 */
export function useWebhookEvent(id: string) {
  return useQuery({
    queryKey: webhookKeys.detail(id),
    queryFn: () => webhookApi.get(id),
    enabled: !!id,
  });
}
