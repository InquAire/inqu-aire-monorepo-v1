/**
 * Organization Types
 */

import { type OrganizationRole } from './permissions';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  description?: string | null;
}

export interface OrganizationMembership {
  organization: Organization;
  role: OrganizationRole;
  permissions: string[];
}

export interface OrganizationWithDetails extends Organization {
  subscription?: OrganizationSubscription | null;
  member_count: number;
  business_count: number;
  my_role?: OrganizationRole;
  my_permissions?: string[];
}

export interface OrganizationSubscription {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  monthly_limit: number;
  current_usage: number;
  max_businesses: number;
  max_members: number;
  billing_cycle_start: string;
  billing_cycle_end: string;
  trial_ends_at?: string | null;
}

export type SubscriptionPlan = 'TRIAL' | 'BASIC' | 'PRO' | 'ENTERPRISE';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';

export interface OrganizationMember {
  id: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar_url?: string | null;
    last_login_at?: string | null;
  };
  role: OrganizationRole;
  permissions: string[];
  joined_at: string;
  invited_by?: string | null;
}

export interface OrganizationInvitation {
  id: string;
  email: string;
  role: OrganizationRole;
  token: string;
  expires_at: string;
  organization: {
    id: string;
    name: string;
  };
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: OrganizationRole;
  invited_by: {
    id: string;
    name: string;
    email: string;
  } | null;
  expires_at: string;
  is_expired: boolean;
  created_at: string;
}

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  logo_url?: string;
  description?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
  logo_url?: string | null;
  description?: string | null;
}

export interface InviteMemberInput {
  email: string;
  role?: OrganizationRole;
}

export interface UpdateMemberRoleInput {
  role: OrganizationRole;
}
