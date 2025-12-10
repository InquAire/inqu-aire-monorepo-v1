import { useQuery } from '@tanstack/react-query';

import { industryConfigApi } from '../../api/industryConfigApi';
import type { QueryIndustryConfigParams } from '../../model/types';

export function useIndustryConfigs(params?: QueryIndustryConfigParams) {
  return useQuery({
    queryKey: ['industry-configs', params],
    queryFn: () => industryConfigApi.list(params),
  });
}
