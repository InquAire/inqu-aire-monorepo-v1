import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 문의 통계 조회 Query DTO
 */
export class GetStatsQueryDto {
  @ApiProperty({
    description: '사업체 ID',
    example: 'clxxx123456789',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  business_id!: string;

  @ApiProperty({
    description: '통계 시작 날짜 (ISO 8601 형식)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({
    description: '통계 종료 날짜 (ISO 8601 형식)',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;
}
