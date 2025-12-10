/**
 * Channel Entity - Mutation Hook: useRegenerateWebhookUrl
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { channelApi } from '../../api/channelApi';
import { channelKeys } from '../../model/constants';

/**
 * Webhook URL 재생성 Hook
 */
export function useRegenerateWebhookUrl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => channelApi.regenerateWebhookUrl(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: channelKeys.detail(id) });
    },
  });
}
