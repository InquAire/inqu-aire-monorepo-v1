/**
 * Organization Mutation Hooks
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { organizationApi } from '../../api/organizationApi';
import { organizationKeys } from '../queries/useOrganizations';

import type {
  CreateOrganizationInput,
  InviteMemberInput,
  OrganizationRole,
  UpdateOrganizationInput,
} from '@/shared/lib/organization';

/**
 * 조직 생성
 */
export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrganizationInput) => organizationApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      toast.success('조직이 생성되었습니다.');
    },
    onError: (error: Error) => {
      toast.error(error.message || '조직 생성에 실패했습니다.');
    },
  });
}

/**
 * 조직 업데이트
 */
export function useUpdateOrganization(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateOrganizationInput) => organizationApi.update(organizationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.detail(organizationId) });
      queryClient.invalidateQueries({ queryKey: organizationKeys.list() });
      toast.success('조직 정보가 업데이트되었습니다.');
    },
    onError: (error: Error) => {
      toast.error(error.message || '조직 업데이트에 실패했습니다.');
    },
  });
}

/**
 * 조직 삭제
 */
export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizationId: string) => organizationApi.delete(organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      toast.success('조직이 삭제되었습니다.');
    },
    onError: (error: Error) => {
      toast.error(error.message || '조직 삭제에 실패했습니다.');
    },
  });
}

/**
 * 멤버 초대
 */
export function useInviteMember(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InviteMemberInput) => organizationApi.inviteMember(organizationId, data),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.members(organizationId) });
      toast.success(`${data.email}로 초대장을 발송했습니다.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || '멤버 초대에 실패했습니다.');
    },
  });
}

/**
 * 멤버 역할 변경
 */
export function useUpdateMemberRole(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: OrganizationRole }) =>
      organizationApi.updateMemberRole(organizationId, userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.members(organizationId) });
      toast.success('멤버 역할이 변경되었습니다.');
    },
    onError: (error: Error) => {
      toast.error(error.message || '역할 변경에 실패했습니다.');
    },
  });
}

/**
 * 멤버 제거
 */
export function useRemoveMember(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => organizationApi.removeMember(organizationId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.members(organizationId) });
      queryClient.invalidateQueries({ queryKey: organizationKeys.detail(organizationId) });
      toast.success('멤버가 제거되었습니다.');
    },
    onError: (error: Error) => {
      toast.error(error.message || '멤버 제거에 실패했습니다.');
    },
  });
}

/**
 * 조직 나가기
 */
export function useLeaveOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (organizationId: string) => organizationApi.leave(organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      toast.success('조직에서 나갔습니다.');
    },
    onError: (error: Error) => {
      toast.error(error.message || '조직 나가기에 실패했습니다.');
    },
  });
}

/**
 * 초대 수락
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => organizationApi.acceptInvitation(token),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      toast.success(`${data.organization.name} 조직에 가입했습니다.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || '초대 수락에 실패했습니다.');
    },
  });
}

/**
 * 초대 재전송
 */
export function useResendInvitation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      organizationApi.resendInvitation(organizationId, invitationId),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.invitations(organizationId) });
      toast.success(`${data.email}로 초대를 재전송했습니다.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || '초대 재전송에 실패했습니다.');
    },
  });
}

/**
 * 초대 취소
 */
export function useCancelInvitation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      organizationApi.cancelInvitation(organizationId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.invitations(organizationId) });
      toast.success('초대가 취소되었습니다.');
    },
    onError: (error: Error) => {
      toast.error(error.message || '초대 취소에 실패했습니다.');
    },
  });
}
