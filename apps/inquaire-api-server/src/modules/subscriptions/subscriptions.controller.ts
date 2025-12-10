import { UserRole } from '@/prisma';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '@ai-next/nestjs-shared';

import { Roles } from '../auth/decorators/roles.decorator';

import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { QuerySubscriptionDto } from './dto/query-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

import { ResourceOwnershipGuard } from '@/common/guards/resource-ownership.guard';

@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(ResourceOwnershipGuard)
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '구독 생성' })
  create(@Body() createSubscriptionDto: CreateSubscriptionDto, @CurrentUser() user?: AuthUser) {
    return this.subscriptionsService.create(createSubscriptionDto, user?.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '구독 목록 조회' })
  findAll(@Query() query: QuerySubscriptionDto, @CurrentUser() user?: AuthUser) {
    return this.subscriptionsService.findAll(query, user?.id);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '구독 통계 조회' })
  getStats() {
    return this.subscriptionsService.getStats();
  }

  @Get('business/:businessId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '사업체별 구독 조회' })
  findByBusinessId(@Param('businessId') businessId: string, @CurrentUser() user?: AuthUser) {
    return this.subscriptionsService.findByBusinessId(businessId, user?.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '구독 상세 조회' })
  findOne(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.subscriptionsService.findOne(id, user?.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '구독 업데이트' })
  update(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
    @CurrentUser() user?: AuthUser
  ) {
    return this.subscriptionsService.update(id, updateSubscriptionDto, user?.id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '구독 취소' })
  cancel(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.subscriptionsService.cancel(id, user?.id);
  }

  @Post(':id/reset-billing-cycle')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '청구 주기 리셋 (관리자 전용)' })
  resetBillingCycle(@Param('id') id: string) {
    return this.subscriptionsService.resetBillingCycle(id);
  }
}
