import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ChannelPlatform {
  KAKAO = 'KAKAO',
  LINE = 'LINE',
}

/**
 * 채널 목록 조회 Query DTO
 */
export class QueryChannelDto {
  @ApiProperty({
    description: '사업체 ID',
    example: 'clxxx123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  business_id?: string;

  @ApiProperty({
    description: '채널 플랫폼',
    enum: ChannelPlatform,
    example: 'KAKAO',
    required: false,
  })
  @IsOptional()
  @IsEnum(ChannelPlatform)
  platform?: ChannelPlatform;

  @ApiProperty({
    description: '검색어 (채널명 또는 플랫폼 채널 ID)',
    example: '우리 회사',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;
}
