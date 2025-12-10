import { useMutation, useQueryClient } from '@tanstack/react-query';

import { industryConfigApi } from '../../api/industryConfigApi';

export function useDeleteIndustryConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: industryConfigApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industry-configs'] });
    },
  });
}
