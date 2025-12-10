import { SubscriptionPlan } from '@/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ description: '사업체 ID' })
  @IsString()
  business_id!: string;

  @ApiProperty({ description: '구독 플랜', enum: SubscriptionPlan })
  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;

  @ApiProperty({ description: '월 문의 제한', example: 1000 })
  @IsInt()
  monthly_limit!: number;

  @ApiProperty({ description: '체험 종료일 (옵션)', required: false })
  @IsOptional()
  @IsString()
  trial_ends_at?: string;
}
