/**
 * Customer Entity - Mutation Hook: useCreateCustomer
 * FSD Entities Layer
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { customerApi } from '../../api/customerApi';
import { customerKeys } from '../../model/constants';
import type { CreateCustomerRequest } from '../../model/types';

/**
 * 고객 생성 Hook
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerRequest) => customerApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
}
