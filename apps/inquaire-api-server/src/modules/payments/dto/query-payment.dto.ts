import { PaymentStatus } from '@/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryPaymentDto {
  @ApiProperty({ description: '상태 필터', enum: PaymentStatus, required: false })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiProperty({ description: '사업체 ID 필터', required: false })
  @IsOptional()
  @IsString()
  business_id?: string;

  @ApiProperty({ description: '구독 ID 필터', required: false })
  @IsOptional()
  @IsString()
  subscription_id?: string;

  @ApiProperty({ description: '페이지 크기', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({ description: '오프셋', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
