/**
 * Business Entity - Mutation Hook: useCreateBusiness
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { businessApi } from '../../api/businessApi';
import { businessKeys } from '../../model/constants';
import type { CreateBusinessRequest } from '../../model/types';

/**
 * 사업체 생성 Hook
 * @param organizationId 조직 ID (필수)
 * @param userId 사용자 ID (권한 확인용)
 */
export function useCreateBusiness(organizationId: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<CreateBusinessRequest, 'organization_id'>) =>
      businessApi.create({ ...data, organization_id: organizationId }, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessKeys.lists() });
    },
  });
}
