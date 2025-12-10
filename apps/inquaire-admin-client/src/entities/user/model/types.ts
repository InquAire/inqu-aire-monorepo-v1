/**
 * User Entity - Types
 * FSD Entities Layer
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

// ============================================
// Core Types
// ============================================

export interface OrganizationMembership {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  role: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  deleted_at: string | null;
  organizations?: OrganizationMembership[];
}

// ============================================
// Request/Response Types
// ============================================

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: UserRole;
}

export interface UpdateUserRequest {
  email?: string;
  name?: string;
  phone?: string;
}

export interface UpdateRoleRequest {
  role: UserRole;
}

export interface QueryUserRequest {
  search?: string;
  role?: UserRole;
  include_deleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface UsersResponse {
  data: User[];
  total: number;
  limit: number;
  offset: number;
}

export interface UserStats {
  total: number;
  by_role: Array<{ role: UserRole; _count: number }>;
  active_last_30_days: number;
}

// ============================================
// Form Types
// ============================================

export const userSchema = z.object({
  name: z.string().min(1, { message: '이름은 필수입니다.' }),
  email: z.string().email({ message: '올바른 이메일 주소를 입력해주세요.' }),
  password: z.string().min(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' }),
  role: z.nativeEnum(UserRole),
});

export type UserFormData = z.infer<typeof userSchema>;
