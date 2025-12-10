import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { QueryChannelDto } from './dto/query-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

import {
  RequireResourceOwnership,
  ResourceOwnershipGuard,
} from '@/common/guards/resource-ownership.guard';

@ApiTags('channels')
@Controller('channels')
@UseGuards(ResourceOwnershipGuard)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  @ApiOperation({ summary: '채널 생성' })
  create(@Body() createChannelDto: CreateChannelDto) {
    return this.channelsService.create(createChannelDto);
  }

  @Get()
  @ApiOperation({ summary: '채널 목록 조회' })
  findAll(@Query() query: QueryChannelDto) {
    return this.channelsService.findAll(query.business_id, query.platform, query.search);
  }

  @Get(':id')
  @ApiOperation({ summary: '채널 상세 조회' })
  @RequireResourceOwnership({ resource: 'channel', paramKey: 'id' })
  findOne(@Param('id') id: string) {
    return this.channelsService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: '채널 통계 조회' })
  @RequireResourceOwnership({ resource: 'channel', paramKey: 'id' })
  getStats(@Param('id') id: string) {
    return this.channelsService.getStats(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '채널 업데이트' })
  @RequireResourceOwnership({ resource: 'channel', paramKey: 'id' })
  update(@Param('id') id: string, @Body() updateChannelDto: UpdateChannelDto) {
    return this.channelsService.update(id, updateChannelDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '채널 삭제' })
  @RequireResourceOwnership({ resource: 'channel', paramKey: 'id' })
  remove(@Param('id') id: string) {
    return this.channelsService.remove(id);
  }

  @Post(':id/toggle-active')
  @ApiOperation({ summary: '채널 활성화/비활성화' })
  @RequireResourceOwnership({ resource: 'channel', paramKey: 'id' })
  toggleActive(@Param('id') id: string) {
    return this.channelsService.toggleActive(id);
  }

  @Post(':id/toggle-auto-reply')
  @ApiOperation({ summary: '자동 응답 활성화/비활성화' })
  @RequireResourceOwnership({ resource: 'channel', paramKey: 'id' })
  toggleAutoReply(@Param('id') id: string) {
    return this.channelsService.toggleAutoReply(id);
  }

  @Post(':id/regenerate-webhook')
  @ApiOperation({ summary: 'Webhook URL 재생성' })
  @RequireResourceOwnership({ resource: 'channel', paramKey: 'id' })
  regenerateWebhookUrl(@Param('id') id: string) {
    return this.channelsService.regenerateWebhookUrl(id);
  }
}
