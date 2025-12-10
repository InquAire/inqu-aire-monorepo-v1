/**
 * Organization Query Hooks
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { organizationApi } from '../../api/organizationApi';

import type {
  OrganizationMember,
  OrganizationMembership,
  OrganizationWithDetails,
  PendingInvitation,
} from '@/shared/lib/organization';

export const organizationKeys = {
  all: ['organizations'] as const,
  lists: () => [...organizationKeys.all, 'list'] as const,
  list: () => [...organizationKeys.lists()] as const,
  details: () => [...organizationKeys.all, 'detail'] as const,
  detail: (id: string) => [...organizationKeys.details(), id] as const,
  members: (id: string) => [...organizationKeys.detail(id), 'members'] as const,
  invitations: (id: string) => [...organizationKeys.detail(id), 'invitations'] as const,
};

/**
 * 내 조직 목록 조회
 */
export function useOrganizations(
  options?: Omit<UseQueryOptions<OrganizationMembership[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<OrganizationMembership[], Error>({
    queryKey: organizationKeys.list(),
    queryFn: () => organizationApi.list(),
    ...options,
  });
}

/**
 * 조직 상세 조회
 */
export function useOrganization(
  id: string,
  options?: Omit<UseQueryOptions<OrganizationWithDetails, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<OrganizationWithDetails, Error>({
    queryKey: organizationKeys.detail(id),
    queryFn: () => organizationApi.get(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * 조직 멤버 목록 조회
 */
export function useOrganizationMembers(
  organizationId: string,
  options?: Omit<UseQueryOptions<OrganizationMember[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<OrganizationMember[], Error>({
    queryKey: organizationKeys.members(organizationId),
    queryFn: () => organizationApi.getMembers(organizationId),
    enabled: !!organizationId,
    ...options,
  });
}

/**
 * 대기 중인 초대 목록 조회
 */
export function usePendingInvitations(
  organizationId: string,
  options?: Omit<UseQueryOptions<PendingInvitation[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PendingInvitation[], Error>({
    queryKey: organizationKeys.invitations(organizationId),
    queryFn: () => organizationApi.getPendingInvitations(organizationId),
    enabled: !!organizationId,
    ...options,
  });
}
