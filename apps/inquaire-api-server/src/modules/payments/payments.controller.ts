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

import { CreatePaymentDto } from './dto/create-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentsService } from './payments.service';

import { ResourceOwnershipGuard } from '@/common/guards/resource-ownership.guard';

@ApiTags('payments')
@Controller('payments')
@UseGuards(ResourceOwnershipGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '결제 생성' })
  create(@Body() createPaymentDto: CreatePaymentDto, @CurrentUser() user?: AuthUser) {
    return this.paymentsService.create(createPaymentDto, user?.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '결제 목록 조회' })
  findAll(@Query() query: QueryPaymentDto, @CurrentUser() user?: AuthUser) {
    return this.paymentsService.findAll(query, user?.id);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '결제 통계 조회' })
  getStats() {
    return this.paymentsService.getStats();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '결제 상세 조회' })
  findOne(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.paymentsService.findOne(id, user?.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '결제 업데이트' })
  update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @CurrentUser() user?: AuthUser
  ) {
    return this.paymentsService.update(id, updatePaymentDto, user?.id);
  }

  @Post(':id/confirm')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: '결제 확인' })
  confirm(
    @Param('id') id: string,
    @Body('payment_key') paymentKey: string,
    @CurrentUser() user?: AuthUser
  ) {
    return this.paymentsService.confirm(id, paymentKey, user?.id);
  }
}
