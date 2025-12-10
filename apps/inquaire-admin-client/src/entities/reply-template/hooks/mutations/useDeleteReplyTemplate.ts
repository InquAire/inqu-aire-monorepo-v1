import { useMutation, useQueryClient } from '@tanstack/react-query';

import { replyTemplateApi } from '../../api/replyTemplateApi';

export function useDeleteReplyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: replyTemplateApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reply-templates'] });
    },
  });
}
