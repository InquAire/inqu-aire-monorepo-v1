/**
 * Customer Entity - Public API
 * FSD Entities Layer
 */

// Types
export type {
  CreateCustomerRequest,
  Customer,
  CustomerStats,
  QueryCustomerParams,
  UpdateCustomerRequest,
} from './model/types';

export { PlatformType } from './model/types';

// Constants
export { customerKeys } from './model/constants';

// API
export { customerApi } from './api/customerApi';

// Query Hooks
export { useCustomer } from './hooks/queries/useCustomer';
export { useCustomers } from './hooks/queries/useCustomers';
export { useCustomerStats } from './hooks/queries/useCustomerStats';

// Mutation Hooks
export { useCreateCustomer } from './hooks/mutations/useCreateCustomer';
export { useDeleteCustomer } from './hooks/mutations/useDeleteCustomer';
export { useMergeCustomers } from './hooks/mutations/useMergeCustomers';
export { useUpdateCustomer } from './hooks/mutations/useUpdateCustomer';
