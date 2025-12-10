/**
 * Organization API
 */

import { apiClient } from '@/shared/api/client';
import type {
  CreateOrganizationInput,
  InviteMemberInput,
  OrganizationInvitation,
  OrganizationMember,
  OrganizationMembership,
  OrganizationWithDetails,
  PendingInvitation,
  UpdateMemberRoleInput,
  UpdateOrganizationInput,
} from '@/shared/lib/organization';

const BASE_URL = '/organizations';

export const organizationApi = {
  /**
   * 조직 생성
   */
  create: async (data: CreateOrganizationInput): Promise<OrganizationWithDetails> => {
    return apiClient.post<OrganizationWithDetails>(BASE_URL, data);
  },

  /**
   * 내 조직 목록 조회
   */
  list: async (): Promise<OrganizationMembership[]> => {
    return apiClient.get<OrganizationMembership[]>(BASE_URL);
  },

  /**
   * 조직 상세 조회
   */
  get: async (id: string): Promise<OrganizationWithDetails> => {
    return apiClient.get<OrganizationWithDetails>(`${BASE_URL}/${id}`);
  },

  /**
   * 조직 업데이트
   */
  update: async (id: string, data: UpdateOrganizationInput): Promise<OrganizationWithDetails> => {
    return apiClient.patch<OrganizationWithDetails>(`${BASE_URL}/${id}`, data);
  },

  /**
   * 조직 삭제
   */
  delete: async (id: string): Promise<{ message: string; id: string }> => {
    return apiClient.delete<{ message: string; id: string }>(`${BASE_URL}/${id}`);
  },

  // ============================================
  // 멤버 관리
  // ============================================

  /**
   * 조직 멤버 목록 조회
   */
  getMembers: async (organizationId: string): Promise<OrganizationMember[]> => {
    return apiClient.get<OrganizationMember[]>(`${BASE_URL}/${organizationId}/members`);
  },

  /**
   * 멤버 초대
   */
  inviteMember: async (
    organizationId: string,
    data: InviteMemberInput
  ): Promise<OrganizationInvitation> => {
    return apiClient.post<OrganizationInvitation>(
      `${BASE_URL}/${organizationId}/members/invite`,
      data
    );
  },

  /**
   * 멤버 역할 변경
   */
  updateMemberRole: async (
    organizationId: string,
    userId: string,
    data: UpdateMemberRoleInput
  ): Promise<OrganizationMember[]> => {
    return apiClient.patch<OrganizationMember[]>(
      `${BASE_URL}/${organizationId}/members/${userId}`,
      data
    );
  },

  /**
   * 멤버 제거
   */
  removeMember: async (organizationId: string, userId: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`${BASE_URL}/${organizationId}/members/${userId}`);
  },

  /**
   * 조직 나가기
   */
  leave: async (organizationId: string): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>(`${BASE_URL}/${organizationId}/leave`);
  },

  // ============================================
  // 초대 관리
  // ============================================

  /**
   * 초대 수락
   */
  acceptInvitation: async (
    token: string
  ): Promise<{ message: string; organization: { id: string; name: string; slug: string } }> => {
    return apiClient.post<{
      message: string;
      organization: { id: string; name: string; slug: string };
    }>(`${BASE_URL}/invitations/${token}/accept`);
  },

  // ============================================
  // 초대 관리
  // ============================================

  /**
   * 대기 중인 초대 목록 조회
   */
  getPendingInvitations: async (organizationId: string): Promise<PendingInvitation[]> => {
    return apiClient.get<PendingInvitation[]>(`${BASE_URL}/${organizationId}/invitations`);
  },

  /**
   * 초대 재전송
   */
  resendInvitation: async (
    organizationId: string,
    invitationId: string
  ): Promise<{ message: string; email: string; expires_at: string }> => {
    return apiClient.post<{ message: string; email: string; expires_at: string }>(
      `${BASE_URL}/${organizationId}/invitations/${invitationId}/resend`
    );
  },

  /**
   * 초대 취소
   */
  cancelInvitation: async (
    organizationId: string,
    invitationId: string
  ): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(
      `${BASE_URL}/${organizationId}/invitations/${invitationId}`
    );
  },
};
