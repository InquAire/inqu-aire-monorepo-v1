import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

import { InquiryRepliesService } from './inquiry-replies.service';
import { CreateInquiryReplyDto } from './dto/create-inquiry-reply.dto';
import { UpdateInquiryReplyDto } from './dto/update-inquiry-reply.dto';
import { QueryInquiryReplyDto } from './dto/query-inquiry-reply.dto';

@ApiTags('Inquiry Replies')
@ApiBearerAuth()
@Controller('inquiry-replies')
@UseGuards(RolesGuard)
export class InquiryRepliesController {
  constructor(private readonly inquiryRepliesService: InquiryRepliesService) {}

  @Post()
  @ApiOperation({ summary: '답변 생성' })
  @ApiResponse({ status: 201, description: '답변이 생성되었습니다' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  create(@Body() createDto: CreateInquiryReplyDto) {
    return this.inquiryRepliesService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: '답변 목록 조회' })
  @ApiResponse({ status: 200, description: '답변 목록 조회 성공' })
  findAll(@Query() query: QueryInquiryReplyDto) {
    return this.inquiryRepliesService.findAll(query);
  }

  @Get('by-inquiry/:inquiryId')
  @ApiOperation({ summary: '특정 문의에 대한 답변 이력 조회' })
  @ApiResponse({ status: 200, description: '답변 이력 조회 성공' })
  findByInquiryId(@Param('inquiryId') inquiryId: string) {
    return this.inquiryRepliesService.findByInquiryId(inquiryId);
  }

  @Get(':id')
  @ApiOperation({ summary: '답변 상세 조회' })
  @ApiResponse({ status: 200, description: '답변 상세 조회 성공' })
  @ApiResponse({ status: 404, description: '답변을 찾을 수 없습니다' })
  findOne(@Param('id') id: string) {
    return this.inquiryRepliesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '답변 업데이트' })
  @ApiResponse({ status: 200, description: '답변이 업데이트되었습니다' })
  @ApiResponse({ status: 404, description: '답변을 찾을 수 없습니다' })
  update(@Param('id') id: string, @Body() updateDto: UpdateInquiryReplyDto) {
    return this.inquiryRepliesService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: '답변 삭제 (ADMIN)' })
  @ApiResponse({ status: 200, description: '답변이 삭제되었습니다' })
  @ApiResponse({ status: 404, description: '답변을 찾을 수 없습니다' })
  remove(@Param('id') id: string) {
    return this.inquiryRepliesService.remove(id);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: '답변 재시도' })
  @ApiResponse({ status: 200, description: '답변 재시도 처리 완료' })
  retry(@Param('id') id: string) {
    return this.inquiryRepliesService.retry(id);
  }

  @Post(':id/mark-sent')
  @ApiOperation({ summary: '답변 전송 완료 처리' })
  @ApiResponse({ status: 200, description: '전송 완료 처리됨' })
  markAsSent(@Param('id') id: string) {
    return this.inquiryRepliesService.markAsSent(id);
  }

  @Post(':id/mark-failed')
  @ApiOperation({ summary: '답변 전송 실패 처리' })
  @ApiResponse({ status: 200, description: '전송 실패 처리됨' })
  markAsFailed(@Param('id') id: string, @Body('reason') reason: string) {
    return this.inquiryRepliesService.markAsFailed(id, reason);
  }
}
