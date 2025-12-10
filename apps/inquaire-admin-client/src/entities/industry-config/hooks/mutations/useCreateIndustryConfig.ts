import { useMutation, useQueryClient } from '@tanstack/react-query';

import { industryConfigApi } from '../../api/industryConfigApi';

export function useCreateIndustryConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: industryConfigApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industry-configs'] });
    },
  });
}
