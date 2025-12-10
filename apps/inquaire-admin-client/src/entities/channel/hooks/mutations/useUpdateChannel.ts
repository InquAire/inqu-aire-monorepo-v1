/**
 * Channel Entity - Mutation Hook: useUpdateChannel
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { channelApi } from '../../api/channelApi';
import { channelKeys } from '../../model/constants';
import type { UpdateChannelRequest } from '../../model/types';

/**
 * 채널 업데이트 Hook
 */
export function useUpdateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChannelRequest }) =>
      channelApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: channelKeys.lists() });
      queryClient.invalidateQueries({ queryKey: channelKeys.detail(variables.id) });
    },
  });
}
