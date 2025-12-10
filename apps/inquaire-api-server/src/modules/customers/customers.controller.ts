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

import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { GetStatsQueryDto } from './dto/get-stats-query.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

import {
  RequireResourceOwnership,
  ResourceOwnershipGuard,
} from '@/common/guards/resource-ownership.guard';

@ApiTags('customers')
@Controller('customers')
@UseGuards(ResourceOwnershipGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: '고객 생성' })
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @ApiOperation({ summary: '고객 목록 조회' })
  findAll(@Query() query: QueryCustomerDto) {
    return this.customersService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '고객 통계 조회' })
  getStats(@Query() query: GetStatsQueryDto) {
    return this.customersService.getStats(query.business_id);
  }

  @Get(':id')
  @ApiOperation({ summary: '고객 상세 조회' })
  @RequireResourceOwnership({ resource: 'customer', paramKey: 'id' })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '고객 업데이트' })
  @RequireResourceOwnership({ resource: 'customer', paramKey: 'id' })
  update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '고객 삭제' })
  @RequireResourceOwnership({ resource: 'customer', paramKey: 'id' })
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }

  @Post(':sourceId/merge/:targetId')
  @ApiOperation({ summary: '고객 병합 (중복 제거)' })
  @RequireResourceOwnership({ resource: 'customer', paramKey: 'sourceId' })
  mergeCustomers(@Param('sourceId') sourceId: string, @Param('targetId') targetId: string) {
    return this.customersService.mergeCustomers(sourceId, targetId);
  }
}
