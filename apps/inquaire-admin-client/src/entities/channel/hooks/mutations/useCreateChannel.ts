/**
 * Channel Entity - Mutation Hook: useCreateChannel
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { channelApi } from '../../api/channelApi';
import { channelKeys } from '../../model/constants';
import type { CreateChannelRequest } from '../../model/types';

/**
 * 채널 생성 Hook
 */
export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChannelRequest) => channelApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: channelKeys.lists() });
    },
  });
}
