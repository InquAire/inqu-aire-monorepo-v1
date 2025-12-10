import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { IndustryType } from '@/prisma';

export class QueryIndustryConfigDto {
  @ApiProperty({
    description: '업종 타입 필터',
    enum: IndustryType,
    required: false,
  })
  @IsOptional()
  @IsEnum(IndustryType)
  industry?: IndustryType;
}
