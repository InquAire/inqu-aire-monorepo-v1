import { PaymentStatus } from '@/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdatePaymentDto {
  @ApiProperty({ description: '결제 상태', enum: PaymentStatus, required: false })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiProperty({ description: '결제 키 (PG사)', required: false })
  @IsOptional()
  @IsString()
  payment_key?: string;

  @ApiProperty({ description: '실패 사유', required: false })
  @IsOptional()
  @IsString()
  failure_reason?: string;
}
