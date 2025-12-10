import { useQuery } from '@tanstack/react-query';

import { replyTemplateApi } from '../../api/replyTemplateApi';
import type { QueryReplyTemplateParams } from '../../model/types';

export function useReplyTemplates(params?: QueryReplyTemplateParams) {
  return useQuery({
    queryKey: ['reply-templates', params],
    queryFn: () => replyTemplateApi.list(params),
  });
}
