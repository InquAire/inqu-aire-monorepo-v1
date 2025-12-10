/**
 * User Entity - Public API
 * FSD Entities Layer
 */

// Types
export type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UpdateRoleRequest,
  QueryUserRequest,
  UsersResponse,
  UserStats,
  UserFormData,
} from './model/types';

export { UserRole, userSchema } from './model/types';

// Constants
export { userKeys } from './model/constants';

// API
export { userApi } from './api/userApi';

// Query Hooks
export { useUsers } from './hooks/queries/useUsers';
export { useUser } from './hooks/queries/useUser';
export { useUserStats } from './hooks/queries/useUserStats';

// Mutation Hooks
export { useCreateUser } from './hooks/mutations/useCreateUser';
export { useUpdateUser } from './hooks/mutations/useUpdateUser';
export { useUpdateUserRole } from './hooks/mutations/useUpdateUserRole';
export { useDeleteUser } from './hooks/mutations/useDeleteUser';
