import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryWebhookEventDto {
  @ApiProperty({
    description: '채널 ID',
    required: false,
    example: 'channel-12345678-90ab-cdef-1234-567890abcdef',
  })
  @IsOptional()
  @IsString()
  channel_id?: string;

  @ApiProperty({
    description: '이벤트 유형',
    required: false,
    example: 'message_received',
  })
  @IsOptional()
  @IsString()
  event_type?: string;

  @ApiProperty({
    description: '처리 여부',
    required: false,
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  processed?: boolean;

  @ApiProperty({
    description: '페이지 번호',
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: '페이지당 항목 수',
    required: false,
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
