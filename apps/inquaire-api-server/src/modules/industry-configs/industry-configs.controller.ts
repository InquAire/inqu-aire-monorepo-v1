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

import { IndustryConfigsService } from './industry-configs.service';
import { CreateIndustryConfigDto } from './dto/create-industry-config.dto';
import { UpdateIndustryConfigDto } from './dto/update-industry-config.dto';
import { QueryIndustryConfigDto } from './dto/query-industry-config.dto';

@ApiTags('Industry Configs')
@ApiBearerAuth()
@Controller('industry-configs')
@UseGuards(RolesGuard)
export class IndustryConfigsController {
  constructor(private readonly industryConfigsService: IndustryConfigsService) {}

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: '업종 설정 생성 (ADMIN)' })
  @ApiResponse({ status: 201, description: '업종 설정이 생성되었습니다' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  create(@Body() createDto: CreateIndustryConfigDto) {
    return this.industryConfigsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: '업종 설정 목록 조회' })
  @ApiResponse({ status: 200, description: '업종 설정 목록 조회 성공' })
  findAll(@Query() query: QueryIndustryConfigDto) {
    return this.industryConfigsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '업종 설정 상세 조회' })
  @ApiResponse({ status: 200, description: '업종 설정 상세 조회 성공' })
  @ApiResponse({ status: 404, description: '업종 설정을 찾을 수 없습니다' })
  findOne(@Param('id') id: string) {
    return this.industryConfigsService.findOne(id);
  }

  @Get('by-industry/:industry')
  @ApiOperation({ summary: '업종별 설정 조회 (industry 기준)' })
  @ApiResponse({ status: 200, description: '업종 설정 조회 성공' })
  @ApiResponse({ status: 404, description: '업종 설정을 찾을 수 없습니다' })
  findByIndustry(@Param('industry') industry: string) {
    return this.industryConfigsService.findByIndustry(industry);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: '업종 설정 업데이트 (ADMIN)' })
  @ApiResponse({ status: 200, description: '업종 설정이 업데이트되었습니다' })
  @ApiResponse({ status: 404, description: '업종 설정을 찾을 수 없습니다' })
  update(@Param('id') id: string, @Body() updateDto: UpdateIndustryConfigDto) {
    return this.industryConfigsService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: '업종 설정 삭제 (ADMIN)' })
  @ApiResponse({ status: 200, description: '업종 설정이 삭제되었습니다' })
  @ApiResponse({ status: 404, description: '업종 설정을 찾을 수 없습니다' })
  remove(@Param('id') id: string) {
    return this.industryConfigsService.remove(id);
  }
}
