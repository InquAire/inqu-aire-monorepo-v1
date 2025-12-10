/**
 * Channel Entity - Mutation Hook: useToggleChannelAutoReply
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { channelApi } from '../../api/channelApi';
import { channelKeys } from '../../model/constants';

/**
 * 자동 응답 활성화/비활성화 Hook
 */
export function useToggleChannelAutoReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => channelApi.toggleAutoReply(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: channelKeys.lists() });
      queryClient.invalidateQueries({ queryKey: channelKeys.detail(id) });
    },
  });
}
