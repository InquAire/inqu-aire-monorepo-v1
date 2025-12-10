import { PlatformType } from '@/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryCustomerDto {
  @ApiProperty({ description: '사업체 ID', required: false })
  @IsOptional()
  @IsString()
  business_id?: string;

  @ApiProperty({ description: '플랫폼', enum: PlatformType, required: false })
  @IsOptional()
  @IsEnum(PlatformType)
  platform?: PlatformType;

  @ApiProperty({ description: '검색어 (이름, 전화번호, 이메일)', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: '시작 날짜 (ISO 8601)', example: '2025-01-01', required: false })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({ description: '종료 날짜 (ISO 8601)', example: '2025-12-31', required: false })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({ description: '페이지 번호 (기본값: 1)', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '페이지 크기 (기본값: 20)', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({ description: '정렬 필드 (기본값: last_contact)', required: false })
  @IsOptional()
  @IsString()
  sortBy?: string = 'last_contact';

  @ApiProperty({ description: '정렬 방향 (asc/desc, 기본값: desc)', required: false })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
