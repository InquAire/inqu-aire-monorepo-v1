/**
 * Reply Template Entity - Query Hook: useReplyTemplate
 * FSD Entities Layer
 */

import { useQuery } from '@tanstack/react-query';

import { replyTemplateApi } from '../../api/replyTemplateApi';
import { replyTemplateKeys } from '../../model/constants';

/**
 * 템플릿 상세 조회 Hook
 */
export function useReplyTemplate(id: string) {
  return useQuery({
    queryKey: replyTemplateKeys.detail(id),
    queryFn: () => replyTemplateApi.get(id),
    enabled: !!id,
  });
}
