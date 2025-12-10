import { SubscriptionPlan, SubscriptionStatus } from '@/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional } from 'class-validator';

export class UpdateSubscriptionDto {
  @ApiProperty({ description: '구독 플랜', enum: SubscriptionPlan, required: false })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @ApiProperty({ description: '구독 상태', enum: SubscriptionStatus, required: false })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiProperty({ description: '월 문의 제한', required: false })
  @IsOptional()
  @IsInt()
  monthly_limit?: number;
}
