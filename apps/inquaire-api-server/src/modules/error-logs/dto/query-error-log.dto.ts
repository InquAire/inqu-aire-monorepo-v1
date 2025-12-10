import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryErrorLogDto {
  @ApiProperty({
    description: '에러 유형',
    required: false,
    example: 'webhook_error',
  })
  @IsOptional()
  @IsString()
  error_type?: string;

  @ApiProperty({
    description: '해결 여부',
    required: false,
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  resolved?: boolean;

  @ApiProperty({
    description: '사용자 ID',
    required: false,
    example: 'user-12345678-90ab-cdef-1234-567890abcdef',
  })
  @IsOptional()
  @IsString()
  user_id?: string;

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
