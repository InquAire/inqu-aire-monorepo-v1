import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateChannelDto {
  @ApiProperty({ description: '채널 이름', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '액세스 토큰', required: false })
  @IsOptional()
  @IsString()
  access_token?: string;

  @ApiProperty({ description: '리프레시 토큰', required: false })
  @IsOptional()
  @IsString()
  refresh_token?: string;

  @ApiProperty({ description: '자동 응답 활성화', required: false })
  @IsOptional()
  @IsBoolean()
  auto_reply_enabled?: boolean;

  @ApiProperty({ description: '활성화 상태', required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({ description: '메타데이터 (JSON)', required: false })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
