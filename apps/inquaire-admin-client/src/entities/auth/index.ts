/**
 * Auth Entity - Public API
 * FSD Entities Layer
 */

// Types
export type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  ProfileResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  SignupRequest,
  SignupResponse,
  UpdateProfileRequest,
  User,
} from './model/types';

// Constants
export { authKeys } from './model/constants';

// API
export { authApi } from './api/authApi';

// Query Hooks
export { useProfile } from './hooks/queries/useProfile';

// Mutation Hooks
export { useChangePassword } from './hooks/mutations/useChangePassword';
export { useLogin } from './hooks/mutations/useLogin';
export { useLogout } from './hooks/mutations/useLogout';
export { useRefreshToken } from './hooks/mutations/useRefreshToken';
export { useSignup } from './hooks/mutations/useSignup';
export { useUpdateProfile } from './hooks/mutations/useUpdateProfile';
