import { UserRole } from '@/prisma';
import { Controller, Get, Param, Patch, Query, Body, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';

import { QueryErrorLogDto } from './dto/query-error-log.dto';
import { ResolveErrorLogDto } from './dto/resolve-error-log.dto';
import { ErrorLogsService } from './error-logs.service';

import { ResourceOwnershipGuard } from '@/common/guards/resource-ownership.guard';

@ApiTags('error-logs')
@Controller('error-logs')
@UseGuards(ResourceOwnershipGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN) // 관리자만 접근
export class ErrorLogsController {
  constructor(private readonly errorLogsService: ErrorLogsService) {}

  @Get()
  @ApiOperation({ summary: '에러 로그 목록 조회' })
  findAll(@Query() query: QueryErrorLogDto) {
    return this.errorLogsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '에러 로그 통계 조회' })
  getStats() {
    return this.errorLogsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: '에러 로그 상세 조회' })
  findOne(@Param('id') id: string) {
    return this.errorLogsService.findOne(id);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: '에러 로그 해결 처리' })
  resolve(@Param('id') id: string, @Body() resolveErrorLogDto: ResolveErrorLogDto) {
    return this.errorLogsService.resolve(id, resolveErrorLogDto);
  }
}
