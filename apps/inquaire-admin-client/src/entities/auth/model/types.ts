/**
 * Auth Entity - Types
 * FSD Entities Layer
 */

import type { User } from '../../user/model/types';

// Re-export User for convenience
export type { User } from '../../user/model/types';

// ============================================
// Business Types
// ============================================

export interface BusinessInfo {
  id: string;
  name: string;
  industry_type: string;
}

// ============================================
// Request/Response Types
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar_url?: string | null;
    created_at: string;
  };
  organizations?: OrganizationMembershipInfo[];
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

export type LoginResponse = AuthResponse;

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export type SignupResponse = AuthResponse;

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

export type RefreshTokenResponse = TokenResponse;

// Organization membership info for profile
export interface OrganizationMembershipInfo {
  organization: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
  };
  role: string;
  permissions: string[];
}

export interface ProfileResponse {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  phone?: string | null;
  role: string;
  created_at: string;
  last_login_at: string | null;
  organizations: OrganizationMembershipInfo[];
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
