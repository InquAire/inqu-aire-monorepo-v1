/**
 * Channel Entity - Query Hook: useChannelStats
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { channelApi } from '../../api/channelApi';
import { channelKeys } from '../../model/constants';

/**
 * 채널 통계 조회 Hook
 */
export function useChannelStats(id: string) {
  return useQuery({
    queryKey: channelKeys.stats(id),
    queryFn: () => channelApi.getStats(id),
    enabled: !!id,
  });
}
