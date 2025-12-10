import { CurrentUser, type AuthUser } from '@ai-next/nestjs-shared';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  CreateOrganizationDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  UpdateOrganizationDto,
} from './dto';
import { OrganizationsService } from './organizations.service';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  // ============================================
  // 조직 CRUD
  // ============================================

  @Post()
  @ApiOperation({ summary: '조직 생성' })
  create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: AuthUser) {
    return this.organizationsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: '내 조직 목록 조회' })
  findMyOrganizations(@CurrentUser() user: AuthUser) {
    return this.organizationsService.findMyOrganizations(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '조직 상세 조회' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.organizationsService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '조직 업데이트' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.organizationsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '조직 삭제' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.organizationsService.remove(id, user.id);
  }

  // ============================================
  // 멤버 관리
  // ============================================

  @Get(':id/members')
  @ApiOperation({ summary: '조직 멤버 목록 조회' })
  getMembers(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.organizationsService.getMembers(id, user.id);
  }

  @Post(':id/members/invite')
  @ApiOperation({ summary: '멤버 초대' })
  inviteMember(
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.organizationsService.inviteMember(id, dto, user.id);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: '멤버 역할 변경' })
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.organizationsService.updateMemberRole(id, targetUserId, dto, user.id);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: '멤버 제거' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthUser
  ) {
    return this.organizationsService.removeMember(id, targetUserId, user.id);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: '조직 나가기' })
  leaveOrganization(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.organizationsService.leaveOrganization(id, user.id);
  }

  // ============================================
  // 초대 관리
  // ============================================

  @Get(':id/invitations')
  @ApiOperation({ summary: '대기 중인 초대 목록 조회' })
  getPendingInvitations(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.organizationsService.getPendingInvitations(id, user.id);
  }

  @Post(':id/invitations/:invitationId/resend')
  @ApiOperation({ summary: '초대 재전송' })
  resendInvitation(
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: AuthUser
  ) {
    return this.organizationsService.resendInvitation(id, invitationId, user.id);
  }

  @Delete(':id/invitations/:invitationId')
  @ApiOperation({ summary: '초대 취소' })
  cancelInvitation(
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: AuthUser
  ) {
    return this.organizationsService.cancelInvitation(id, invitationId, user.id);
  }

  @Post('invitations/:token/accept')
  @ApiOperation({ summary: '초대 수락' })
  acceptInvitation(@Param('token') token: string, @CurrentUser() user: AuthUser) {
    return this.organizationsService.acceptInvitation(token, user.id);
  }
}
