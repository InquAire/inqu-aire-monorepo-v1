import { useMutation, useQueryClient } from '@tanstack/react-query';

import { replyTemplateApi } from '../../api/replyTemplateApi';

export function useCreateReplyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: replyTemplateApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reply-templates'] });
    },
  });
}
