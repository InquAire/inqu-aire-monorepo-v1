/**
 * Channel Entity - Query Hook: useChannel
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { channelApi } from '../../api/channelApi';
import { channelKeys } from '../../model/constants';

/**
 * 채널 상세 조회 Hook
 */
export function useChannel(id: string) {
  return useQuery({
    queryKey: channelKeys.detail(id),
    queryFn: () => channelApi.get(id),
    enabled: !!id,
  });
}
