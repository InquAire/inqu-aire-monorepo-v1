import { useMutation, useQueryClient } from '@tanstack/react-query';

import { replyTemplateApi } from '../../api/replyTemplateApi';

export function useUpdateReplyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      replyTemplateApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reply-templates'] });
    },
  });
}
