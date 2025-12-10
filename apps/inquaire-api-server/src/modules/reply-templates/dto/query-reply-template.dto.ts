import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryReplyTemplateDto {
  @ApiProperty({ description: '사업체 ID', required: false })
  @IsOptional()
  @IsString()
  business_id?: string;

  @ApiProperty({ description: '문의 유형', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: '검색어 (템플릿 이름 또는 내용)', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: '활성 상태', required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  is_active?: boolean;

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
}
