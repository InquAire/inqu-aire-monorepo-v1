import { UserRole } from '@/prisma';
import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';

import { QueryWebhookEventDto } from './dto/query-webhook-event.dto';
import { WebhookEventsService } from './webhook-events.service';

import { ResourceOwnershipGuard } from '@/common/guards/resource-ownership.guard';

@ApiTags('webhook-events')
@Controller('webhook-events')
@UseGuards(ResourceOwnershipGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN) // 관리자만 접근
export class WebhookEventsController {
  constructor(private readonly webhookEventsService: WebhookEventsService) {}

  @Get()
  @ApiOperation({ summary: '웹훅 이벤트 목록 조회' })
  findAll(@Query() query: QueryWebhookEventDto) {
    return this.webhookEventsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '웹훅 이벤트 통계 조회' })
  getStats() {
    return this.webhookEventsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: '웹훅 이벤트 상세 조회' })
  findOne(@Param('id') id: string) {
    return this.webhookEventsService.findOne(id);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: '웹훅 이벤트 재시도' })
  retry(@Param('id') id: string) {
    return this.webhookEventsService.retry(id);
  }
}
