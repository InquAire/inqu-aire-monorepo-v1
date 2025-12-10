import { useQuery } from '@tanstack/react-query';

import { inquiryReplyApi } from '../../api/inquiryReplyApi';

export function useInquiryRepliesByInquiryId(inquiryId: string) {
  return useQuery({
    queryKey: ['inquiry-replies', inquiryId],
    queryFn: () => inquiryReplyApi.listByInquiryId(inquiryId),
    enabled: !!inquiryId, // inquiryId가 있을 때만 실행
  });
}
