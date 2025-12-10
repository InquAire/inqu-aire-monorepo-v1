import { randomBytes } from 'crypto';

import { OrganizationRole, SubscriptionPlan, SubscriptionStatus } from '@/prisma';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  CreateOrganizationDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  UpdateOrganizationDto,
} from './dto';

import { EmailService } from '@/common/modules/email/email.service';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { canAssignRole, hasPermission, Permission } from '@/common/utils/permissions';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
    private readonly emailService: EmailService
  ) {}

  /**
   * 조직 생성 (생성자는 자동으로 OWNER가 됨)
   */
  async create(dto: CreateOrganizationDto, userId: string) {
    this.logger.log(`Creating organization: ${dto.name} by user: ${userId}`);

    // 사용자 존재 확인
    const user = await this.prisma.read.user.findFirst({
      where: { id: userId, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 슬러그 생성 (제공되지 않은 경우)
    const slug = dto.slug || this.generateSlug(dto.name);

    // 슬러그 중복 확인
    const existingOrg = await this.prisma.read.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      throw new ConflictException(`Organization with slug "${slug}" already exists`);
    }

    // 트랜잭션으로 조직 + 멤버 + 구독 생성
    const organization = await this.prisma.write.$transaction(async tx => {
      // 조직 생성
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          slug,
          logo_url: dto.logo_url,
          description: dto.description,
        },
      });

      // 생성자를 OWNER로 추가
      await tx.organizationMember.create({
        data: {
          organization_id: org.id,
          user_id: userId,
          role: OrganizationRole.OWNER,
        },
      });

      // 기본 구독 (TRIAL) 생성
      const now = new Date();
      const trialEndDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14일 후
      const billingCycleEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30일 후

      await tx.organizationSubscription.create({
        data: {
          organization_id: org.id,
          plan: SubscriptionPlan.TRIAL,
          status: SubscriptionStatus.TRIAL,
          monthly_limit: 100, // TRIAL 기본 제한
          max_businesses: 1,
          max_members: 3,
          billing_cycle_start: now,
          billing_cycle_end: billingCycleEnd,
          trial_ends_at: trialEndDate,
        },
      });

      return org;
    });

    this.logger.log(`Created organization ${organization.id} by user ${userId}`);

    return this.findOne(organization.id, userId);
  }

  /**
   * 내 조직 목록 조회
   */
  async findMyOrganizations(userId: string) {
    const memberships = await this.prisma.read.organizationMember.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
        organization: {
          deleted_at: null,
        },
      },
      include: {
        organization: {
          include: {
            subscription: true,
            _count: {
              select: {
                members: {
                  where: { deleted_at: null },
                },
                businesses: {
                  where: { deleted_at: null },
                },
              },
            },
          },
        },
      },
      orderBy: {
        joined_at: 'asc',
      },
    });

    return memberships.map(m => ({
      organization: {
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        logo_url: m.organization.logo_url,
        description: m.organization.description,
        subscription: m.organization.subscription,
        member_count: m.organization._count.members,
        business_count: m.organization._count.businesses,
      },
      role: m.role,
      permissions: m.permissions,
      joined_at: m.joined_at,
    }));
  }

  /**
   * 조직 상세 조회
   */
  async findOne(id: string, userId: string) {
    const organization = await this.prisma.read.organization.findFirst({
      where: { id, deleted_at: null },
      include: {
        subscription: true,
        _count: {
          select: {
            members: {
              where: { deleted_at: null },
            },
            businesses: {
              where: { deleted_at: null },
            },
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    // 멤버십 확인
    const membership = await this.getMembership(id, userId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    return {
      ...organization,
      my_role: membership.role,
      my_permissions: membership.permissions,
    };
  }

  /**
   * 조직 업데이트
   */
  async update(id: string, dto: UpdateOrganizationDto, userId: string) {
    this.logger.log(`Updating organization ${id} by user ${userId}`);

    // 권한 확인
    await this.checkPermission(id, userId, 'organization:settings');

    // 슬러그 중복 확인 (변경된 경우)
    if (dto.slug) {
      const existingOrg = await this.prisma.read.organization.findFirst({
        where: {
          slug: dto.slug,
          id: { not: id },
        },
      });

      if (existingOrg) {
        throw new ConflictException(`Organization with slug "${dto.slug}" already exists`);
      }
    }

    await this.prisma.write.organization.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug }),
        ...(dto.logo_url !== undefined && { logo_url: dto.logo_url }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    this.logger.log(`Updated organization ${id}`);

    return this.findOne(id, userId);
  }

  /**
   * 조직 삭제 (소프트 삭제)
   */
  async remove(id: string, userId: string) {
    this.logger.log(`Deleting organization ${id} by user ${userId}`);

    // OWNER만 삭제 가능
    await this.checkPermission(id, userId, 'organization:delete');

    // 활성 사업체 확인
    const activeBusinesses = await this.prisma.read.business.count({
      where: {
        organization_id: id,
        deleted_at: null,
      },
    });

    if (activeBusinesses > 0) {
      throw new BadRequestException(
        'Cannot delete organization with active businesses. Please delete all businesses first.'
      );
    }

    await this.prisma.write.organization.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    this.logger.log(`Deleted organization ${id}`);

    return { message: 'Organization deleted successfully', id };
  }

  // ============================================
  // 멤버 관리
  // ============================================

  /**
   * 조직 멤버 목록 조회
   */
  async getMembers(organizationId: string, userId: string) {
    // 멤버십 확인
    const membership = await this.getMembership(organizationId, userId);
    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const members = await this.prisma.read.organizationMember.findMany({
      where: {
        organization_id: organizationId,
        deleted_at: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar_url: true,
            last_login_at: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joined_at: 'asc' }],
    });

    return members.map(m => ({
      id: m.id,
      user: m.user,
      role: m.role,
      permissions: m.permissions,
      joined_at: m.joined_at,
      invited_by: m.invited_by,
    }));
  }

  /**
   * 멤버 초대
   */
  async inviteMember(organizationId: string, dto: InviteMemberDto, invitedByUserId: string) {
    this.logger.log(`Inviting ${dto.email} to organization ${organizationId}`);

    // 권한 확인
    const membership = await this.checkPermission(organizationId, invitedByUserId, 'member:invite');

    // 역할 할당 가능 여부 확인
    const targetRole = dto.role || OrganizationRole.MEMBER;
    if (!canAssignRole(membership.role, targetRole)) {
      throw new ForbiddenException(`You cannot assign the ${targetRole} role`);
    }

    // 이미 초대된 이메일 확인
    const existingInvitation = await this.prisma.read.organizationInvitation.findFirst({
      where: {
        organization_id: organizationId,
        email: dto.email,
        accepted_at: null,
        expires_at: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      throw new ConflictException('This email has already been invited');
    }

    // 이미 멤버인지 확인
    const existingMember = await this.prisma.read.organizationMember.findFirst({
      where: {
        organization_id: organizationId,
        deleted_at: null,
        user: {
          email: dto.email,
          deleted_at: null,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('This user is already a member of the organization');
    }

    // 구독 제한 확인
    const organization = await this.prisma.read.organization.findFirst({
      where: { id: organizationId },
      include: {
        subscription: true,
        _count: {
          select: {
            members: { where: { deleted_at: null } },
          },
        },
      },
    });

    if (
      organization?.subscription &&
      organization._count.members >= organization.subscription.max_members
    ) {
      throw new BadRequestException(
        `Maximum number of members (${organization.subscription.max_members}) reached. Please upgrade your plan.`
      );
    }

    // 초대 토큰 생성
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일 후 만료

    const invitation = await this.prisma.write.organizationInvitation.create({
      data: {
        organization_id: organizationId,
        email: dto.email,
        role: targetRole,
        token,
        invited_by: invitedByUserId,
        expires_at: expiresAt,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Created invitation ${invitation.id} for ${dto.email}`);

    // 초대자 정보 조회
    const inviter = await this.prisma.read.user.findFirst({
      where: { id: invitedByUserId },
      select: { name: true, email: true },
    });

    // 이메일 발송
    await this.emailService.sendOrganizationInvite({
      recipientEmail: dto.email,
      organizationName: invitation.organization.name,
      inviterName: inviter?.name || inviter?.email || 'Unknown',
      role: targetRole,
      inviteToken: token,
      expiresAt,
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      token: invitation.token,
      expires_at: invitation.expires_at,
      organization: invitation.organization,
    };
  }

  /**
   * 초대 수락
   */
  async acceptInvitation(token: string, userId: string) {
    this.logger.log(`Accepting invitation with token by user ${userId}`);

    const invitation = await this.prisma.read.organizationInvitation.findUnique({
      where: { token },
      include: {
        organization: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.accepted_at) {
      throw new BadRequestException('This invitation has already been accepted');
    }

    if (invitation.expires_at < new Date()) {
      throw new BadRequestException('This invitation has expired');
    }

    // 사용자 이메일 확인
    const user = await this.prisma.read.user.findFirst({
      where: { id: userId, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email !== invitation.email) {
      throw new ForbiddenException('This invitation is not for your email address');
    }

    // 이미 멤버인지 확인
    const existingMember = await this.prisma.read.organizationMember.findFirst({
      where: {
        organization_id: invitation.organization_id,
        user_id: userId,
        deleted_at: null,
      },
    });

    if (existingMember) {
      throw new ConflictException('You are already a member of this organization');
    }

    // 트랜잭션으로 초대 수락 + 멤버 추가
    await this.prisma.write.$transaction(async tx => {
      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: { accepted_at: new Date() },
      });

      await tx.organizationMember.create({
        data: {
          organization_id: invitation.organization_id,
          user_id: userId,
          role: invitation.role,
          invited_by: invitation.invited_by,
        },
      });
    });

    this.logger.log(`User ${userId} joined organization ${invitation.organization_id}`);

    // 초대한 사람에게 알림 이메일 발송
    if (invitation.invited_by) {
      const inviter = await this.prisma.read.user.findFirst({
        where: { id: invitation.invited_by },
        select: { email: true, name: true },
      });

      if (inviter?.email) {
        await this.emailService.sendInviteAcceptedNotification(
          inviter.email,
          inviter.name || inviter.email,
          user.name || user.email,
          invitation.organization.name
        );
      }
    }

    return {
      message: 'Successfully joined the organization',
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
        slug: invitation.organization.slug,
      },
    };
  }

  /**
   * 멤버 역할 변경
   */
  async updateMemberRole(
    organizationId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
    requestUserId: string
  ) {
    this.logger.log(`Updating role for user ${targetUserId} in organization ${organizationId}`);

    // 권한 확인
    const membership = await this.checkPermission(organizationId, requestUserId, 'member:role');

    // 자기 자신의 역할은 변경 불가
    if (targetUserId === requestUserId) {
      throw new BadRequestException('You cannot change your own role');
    }

    // 대상 멤버 확인
    const targetMember = await this.prisma.read.organizationMember.findFirst({
      where: {
        organization_id: organizationId,
        user_id: targetUserId,
        deleted_at: null,
      },
    });

    if (!targetMember) {
      throw new NotFoundException('Member not found');
    }

    // OWNER 역할 변경 불가
    if (targetMember.role === OrganizationRole.OWNER) {
      throw new ForbiddenException('Cannot change the role of the organization owner');
    }

    // 역할 할당 가능 여부 확인
    if (!canAssignRole(membership.role, dto.role)) {
      throw new ForbiddenException(`You cannot assign the ${dto.role} role`);
    }

    await this.prisma.write.organizationMember.update({
      where: { id: targetMember.id },
      data: { role: dto.role },
    });

    this.logger.log(`Updated role for user ${targetUserId} to ${dto.role}`);

    return this.getMembers(organizationId, requestUserId);
  }

  /**
   * 멤버 제거
   */
  async removeMember(organizationId: string, targetUserId: string, requestUserId: string) {
    this.logger.log(`Removing user ${targetUserId} from organization ${organizationId}`);

    // 권한 확인
    await this.checkPermission(organizationId, requestUserId, 'member:remove');

    // 자기 자신은 제거 불가 (나가기는 별도 API)
    if (targetUserId === requestUserId) {
      throw new BadRequestException('You cannot remove yourself. Use the leave endpoint instead.');
    }

    // 대상 멤버 확인
    const targetMember = await this.prisma.read.organizationMember.findFirst({
      where: {
        organization_id: organizationId,
        user_id: targetUserId,
        deleted_at: null,
      },
    });

    if (!targetMember) {
      throw new NotFoundException('Member not found');
    }

    // OWNER는 제거 불가
    if (targetMember.role === OrganizationRole.OWNER) {
      throw new ForbiddenException('Cannot remove the organization owner');
    }

    await this.prisma.write.organizationMember.update({
      where: { id: targetMember.id },
      data: { deleted_at: new Date() },
    });

    this.logger.log(`Removed user ${targetUserId} from organization ${organizationId}`);

    return { message: 'Member removed successfully' };
  }

  /**
   * 조직 나가기
   */
  async leaveOrganization(organizationId: string, userId: string) {
    this.logger.log(`User ${userId} leaving organization ${organizationId}`);

    const membership = await this.getMembership(organizationId, userId);

    if (!membership) {
      throw new NotFoundException('You are not a member of this organization');
    }

    // OWNER는 나갈 수 없음 (조직 삭제 또는 소유권 이전 필요)
    if (membership.role === OrganizationRole.OWNER) {
      throw new ForbiddenException(
        'Organization owners cannot leave. Transfer ownership or delete the organization.'
      );
    }

    await this.prisma.write.organizationMember.update({
      where: { id: membership.id },
      data: { deleted_at: new Date() },
    });

    this.logger.log(`User ${userId} left organization ${organizationId}`);

    return { message: 'Successfully left the organization' };
  }

  // ============================================
  // 초대 관리
  // ============================================

  /**
   * 대기 중인 초대 목록 조회
   */
  async getPendingInvitations(organizationId: string, userId: string) {
    // 멤버십 확인
    await this.checkPermission(organizationId, userId, 'member:invite');

    const invitations = await this.prisma.read.organizationInvitation.findMany({
      where: {
        organization_id: organizationId,
        accepted_at: null,
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return invitations.map(inv => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      invited_by: inv.inviter
        ? {
            id: inv.inviter.id,
            name: inv.inviter.name,
            email: inv.inviter.email,
          }
        : null,
      expires_at: inv.expires_at,
      is_expired: inv.expires_at < new Date(),
      created_at: inv.created_at,
    }));
  }

  /**
   * 초대 재전송
   */
  async resendInvitation(organizationId: string, invitationId: string, userId: string) {
    this.logger.log(`Resending invitation ${invitationId} for organization ${organizationId}`);

    // 권한 확인
    await this.checkPermission(organizationId, userId, 'member:invite');

    // 초대 확인
    const invitation = await this.prisma.read.organizationInvitation.findFirst({
      where: {
        id: invitationId,
        organization_id: organizationId,
        accepted_at: null,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or already accepted');
    }

    // 새 토큰과 만료일 생성
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일 후 만료

    // 초대 업데이트
    await this.prisma.write.organizationInvitation.update({
      where: { id: invitationId },
      data: {
        token,
        expires_at: expiresAt,
        updated_at: new Date(),
      },
    });

    // 재전송 사용자 정보 조회
    const inviter = await this.prisma.read.user.findFirst({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // 이메일 재발송
    await this.emailService.sendOrganizationInvite({
      recipientEmail: invitation.email,
      organizationName: invitation.organization.name,
      inviterName: inviter?.name || inviter?.email || 'Unknown',
      role: invitation.role,
      inviteToken: token,
      expiresAt,
    });

    this.logger.log(`Resent invitation to ${invitation.email}`);

    return {
      message: 'Invitation resent successfully',
      email: invitation.email,
      expires_at: expiresAt,
    };
  }

  /**
   * 초대 취소
   */
  async cancelInvitation(organizationId: string, invitationId: string, userId: string) {
    this.logger.log(`Canceling invitation ${invitationId} for organization ${organizationId}`);

    // 권한 확인
    await this.checkPermission(organizationId, userId, 'member:invite');

    // 초대 확인
    const invitation = await this.prisma.read.organizationInvitation.findFirst({
      where: {
        id: invitationId,
        organization_id: organizationId,
        accepted_at: null,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or already accepted');
    }

    // 초대 삭제
    await this.prisma.write.organizationInvitation.delete({
      where: { id: invitationId },
    });

    this.logger.log(`Canceled invitation ${invitationId} for ${invitation.email}`);

    return { message: 'Invitation canceled successfully' };
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * 사용자의 조직 멤버십 조회
   */
  async getMembership(organizationId: string, userId: string) {
    return this.prisma.read.organizationMember.findFirst({
      where: {
        organization_id: organizationId,
        user_id: userId,
        deleted_at: null,
      },
    });
  }

  /**
   * 권한 확인
   */
  async checkPermission(organizationId: string, userId: string, permission: Permission) {
    const membership = await this.getMembership(organizationId, userId);

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    if (!hasPermission(membership.role, permission)) {
      throw new ForbiddenException(`You do not have permission: ${permission}`);
    }

    return membership;
  }

  /**
   * 슬러그 생성
   */
  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 40);

    // 랜덤 suffix 추가
    const suffix = randomBytes(4).toString('hex');
    return `${baseSlug}-${suffix}`;
  }
}
