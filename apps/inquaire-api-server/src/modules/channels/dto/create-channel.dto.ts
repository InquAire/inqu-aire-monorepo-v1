import { PlatformType } from '@/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateChannelDto {
  @ApiProperty({
    description: '사업체 ID',
    example: 'bus-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  business_id!: string;

  @ApiProperty({
    description: '플랫폼',
    enum: PlatformType,
    example: 'KAKAO',
  })
  @IsEnum(PlatformType)
  platform!: PlatformType;

  @ApiProperty({
    description: '채널 이름',
    example: '서울메디컬치과 카카오톡 채널',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: '플랫폼 채널 ID',
    example: '_xjAbCdEf',
  })
  @IsString()
  @IsNotEmpty()
  platform_channel_id!: string;

  @ApiProperty({
    description: '액세스 토큰',
    example: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890',
  })
  @IsString()
  @IsNotEmpty()
  access_token!: string;

  @ApiProperty({
    description: '리프레시 토큰',
    required: false,
    example: 'rEfReSh_TokEN_1234567890aBcDeFgHiJkL',
  })
  @IsOptional()
  @IsString()
  refresh_token?: string;

  @ApiProperty({
    description: '자동 응답 활성화',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  auto_reply_enabled?: boolean;

  @ApiProperty({
    description: '메타데이터 (JSON)',
    required: false,
    example: {
      webhook_url: 'https://api.inquaire.com/webhooks/kakao',
      bot_user_key: 'bot_key_123456',
    },
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
