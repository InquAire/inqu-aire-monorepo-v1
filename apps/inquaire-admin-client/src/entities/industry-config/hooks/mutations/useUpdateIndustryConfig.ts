import { useMutation, useQueryClient } from '@tanstack/react-query';

import { industryConfigApi } from '../../api/industryConfigApi';
import type { UpdateIndustryConfigRequest } from '../../model/types';

export function useUpdateIndustryConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIndustryConfigRequest }) =>
      industryConfigApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industry-configs'] });
    },
  });
}
