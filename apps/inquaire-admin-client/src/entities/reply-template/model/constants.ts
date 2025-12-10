/**
 * Reply Template Entity - Constants
 * FSD Entities Layer
 */

import type { QueryReplyTemplateParams } from './types';

/**
 * Query Keys
 */
export const replyTemplateKeys = {
  all: ['replyTemplates'] as const,
  lists: () => [...replyTemplateKeys.all, 'list'] as const,
  list: (params?: QueryReplyTemplateParams) => [...replyTemplateKeys.lists(), params] as const,
  details: () => [...replyTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...replyTemplateKeys.details(), id] as const,
};
