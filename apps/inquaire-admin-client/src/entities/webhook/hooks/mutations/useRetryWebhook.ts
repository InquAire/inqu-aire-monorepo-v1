/**
 * Webhook Entity - Mutation Hook: useRetryWebhook
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { webhookApi } from '../../api/webhookApi';
import { webhookKeys } from '../../model/constants';

/**
 * 웹훅 재처리 Hook
 */
export function useRetryWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => webhookApi.retry(id),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.detail(id) });
      if (data.channel_id) {
        queryClient.invalidateQueries({
          queryKey: webhookKeys.list({ channel_id: data.channel_id }),
        });
      }
      queryClient.invalidateQueries({ queryKey: webhookKeys.lists() });
    },
  });
}
