/**
 * Channel Entity - Mutation Hook: useToggleChannelActive
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { channelApi } from '../../api/channelApi';
import { channelKeys } from '../../model/constants';

/**
 * 채널 활성화/비활성화 Hook
 */
export function useToggleChannelActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => channelApi.toggleActive(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: channelKeys.lists() });
      queryClient.invalidateQueries({ queryKey: channelKeys.detail(id) });
    },
  });
}
