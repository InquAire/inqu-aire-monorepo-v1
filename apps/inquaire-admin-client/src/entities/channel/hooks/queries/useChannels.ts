/**
 * Channel Entity - Query Hook: useChannels
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { channelApi } from '../../api/channelApi';
import { channelKeys } from '../../model/constants';
import type { QueryChannelParams } from '../../model/types';

/**
 * 채널 목록 조회 Hook
 */
export function useChannels(params?: QueryChannelParams) {
  return useQuery({
    queryKey: channelKeys.list(params),
    queryFn: () => channelApi.list(params),
  });
}
