import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * 고객 통계 조회 Query DTO
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
}
