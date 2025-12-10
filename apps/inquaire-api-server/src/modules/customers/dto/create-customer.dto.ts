import { PlatformType } from '@/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({
    description: '사업체 ID',
    example: 'bus-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  business_id!: string;

  @ApiProperty({
    description: '플랫폼 사용자 ID',
    example: 'kakao_user_123456789',
  })
  @IsString()
  @IsNotEmpty()
  platform_user_id!: string;

  @ApiProperty({
    description: '플랫폼',
    enum: PlatformType,
    example: 'KAKAO',
  })
  @IsEnum(PlatformType)
  platform!: PlatformType;

  @ApiProperty({
    description: '고객 이름',
    required: false,
    example: '김철수',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: '전화번호',
    required: false,
    example: '010-1234-5678',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: '이메일',
    required: false,
    example: 'customer@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: '메모',
    required: false,
    example: 'VIP 고객, 정기 예약 선호',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: '태그 (JSON 배열)',
    required: false,
    example: ['VIP', '정기고객', '병원'],
  })
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    description: '메타데이터 (JSON)',
    required: false,
    example: {
      source: 'kakao_ad_campaign',
      referrer: 'naver_blog',
      preference: 'weekend_appointments',
    },
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
