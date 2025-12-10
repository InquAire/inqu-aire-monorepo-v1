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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { ReplyTemplatesService } from './reply-templates.service';
import {
  CreateReplyTemplateDto,
  UpdateReplyTemplateDto,
  QueryReplyTemplateDto,
} from './dto';

@ApiTags('Reply Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reply-templates')
export class ReplyTemplatesController {
  constructor(
    private readonly replyTemplatesService: ReplyTemplatesService
  ) {}

  @Post()
  @ApiOperation({ summary: '답변 템플릿 생성' })
  @ApiResponse({ status: 201, description: '템플릿이 생성되었습니다' })
  create(@Body() createDto: CreateReplyTemplateDto) {
    return this.replyTemplatesService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: '답변 템플릿 목록 조회' })
  @ApiResponse({ status: 200, description: '템플릿 목록이 조회되었습니다' })
  findAll(@Query() query: QueryReplyTemplateDto) {
    return this.replyTemplatesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '답변 템플릿 상세 조회' })
  @ApiResponse({ status: 200, description: '템플릿이 조회되었습니다' })
  @ApiResponse({ status: 404, description: '템플릿을 찾을 수 없습니다' })
  findOne(@Param('id') id: string) {
    return this.replyTemplatesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '답변 템플릿 수정' })
  @ApiResponse({ status: 200, description: '템플릿이 수정되었습니다' })
  @ApiResponse({ status: 404, description: '템플릿을 찾을 수 없습니다' })
  update(@Param('id') id: string, @Body() updateDto: UpdateReplyTemplateDto) {
    return this.replyTemplatesService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '답변 템플릿 삭제 (소프트 삭제)' })
  @ApiResponse({ status: 204, description: '템플릿이 삭제되었습니다' })
  @ApiResponse({ status: 404, description: '템플릿을 찾을 수 없습니다' })
  async remove(@Param('id') id: string) {
    await this.replyTemplatesService.remove(id);
  }

  @Post(':id/increment-usage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '템플릿 사용 횟수 증가' })
  @ApiResponse({ status: 200, description: '사용 횟수가 증가되었습니다' })
  incrementUsage(@Param('id') id: string) {
    return this.replyTemplatesService.incrementUsageCount(id);
  }
}
