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

import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import {
  BusinessCreateQueryDto,
  BusinessDetailQueryDto,
  BusinessListQueryDto,
} from './dto/user-id-query.dto';

import {
  RequireResourceOwnership,
  ResourceOwnershipGuard,
} from '@/common/guards/resource-ownership.guard';

@ApiTags('businesses')
@Controller('businesses')
@UseGuards(ResourceOwnershipGuard)
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post()
  @ApiOperation({ summary: '사업체(지점) 생성' })
  create(@Body() createBusinessDto: CreateBusinessDto, @Query() query: BusinessCreateQueryDto) {
    return this.businessesService.create(createBusinessDto, query.user_id);
  }

  @Get()
  @ApiOperation({ summary: '사업체 목록 조회 (조직별)' })
  findAll(@Query() query: BusinessListQueryDto) {
    return this.businessesService.findAll(query.organization_id, query.user_id);
  }

  @Get(':id')
  @ApiOperation({ summary: '사업체 상세 조회' })
  @RequireResourceOwnership({ resource: 'business', paramKey: 'id' })
  findOne(@Param('id') id: string, @Query() query: BusinessDetailQueryDto) {
    return this.businessesService.findOne(id, query.user_id);
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: '사업체 대시보드 통계' })
  @RequireResourceOwnership({ resource: 'business', paramKey: 'id' })
  getDashboard(@Param('id') id: string, @Query() query: BusinessDetailQueryDto) {
    return this.businessesService.getDashboard(id, query.user_id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '사업체 업데이트' })
  @RequireResourceOwnership({ resource: 'business', paramKey: 'id' })
  update(
    @Param('id') id: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
    @Query() query: BusinessDetailQueryDto
  ) {
    return this.businessesService.update(id, updateBusinessDto, query.user_id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '사업체 삭제' })
  @RequireResourceOwnership({ resource: 'business', paramKey: 'id' })
  remove(@Param('id') id: string, @Query() query: BusinessDetailQueryDto) {
    return this.businessesService.remove(id, query.user_id);
  }
}
