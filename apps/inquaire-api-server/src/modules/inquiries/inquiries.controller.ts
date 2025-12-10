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

import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { GetStatsQueryDto } from './dto/get-stats-query.dto';
import { QueryInquiryDto } from './dto/query-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';
import { InquiriesService } from './inquiries.service';

import {
  RequireResourceOwnership,
  ResourceOwnershipGuard,
} from '@/common/guards/resource-ownership.guard';

@ApiTags('inquiries')
@Controller('inquiries')
@UseGuards(ResourceOwnershipGuard)
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post()
  @ApiOperation({ summary: '문의 생성' })
  create(@Body() createInquiryDto: CreateInquiryDto) {
    return this.inquiriesService.create(createInquiryDto);
  }

  @Get()
  @ApiOperation({ summary: '문의 목록 조회' })
  findAll(@Query() query: QueryInquiryDto) {
    return this.inquiriesService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '문의 통계 조회' })
  getStats(@Query() query: GetStatsQueryDto) {
    return this.inquiriesService.getStats(
      query.business_id,
      query.start_date ? new Date(query.start_date) : undefined,
      query.end_date ? new Date(query.end_date) : undefined
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '문의 상세 조회' })
  @RequireResourceOwnership({ resource: 'inquiry', paramKey: 'id' })
  findOne(@Param('id') id: string) {
    return this.inquiriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '문의 업데이트' })
  @RequireResourceOwnership({ resource: 'inquiry', paramKey: 'id' })
  update(@Param('id') id: string, @Body() updateInquiryDto: UpdateInquiryDto) {
    return this.inquiriesService.update(id, updateInquiryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '문의 삭제' })
  @RequireResourceOwnership({ resource: 'inquiry', paramKey: 'id' })
  remove(@Param('id') id: string) {
    return this.inquiriesService.remove(id);
  }

  @Post(':id/analyze')
  @ApiOperation({ summary: 'AI 분석 실행' })
  @RequireResourceOwnership({ resource: 'inquiry', paramKey: 'id' })
  analyzeWithAi(@Param('id') id: string) {
    return this.inquiriesService.analyzeWithAi(id);
  }
}
