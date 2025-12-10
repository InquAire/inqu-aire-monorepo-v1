import { IndustryType } from '@/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateIndustryConfigDto {
  @ApiProperty({
    description: '업종 타입',
    enum: IndustryType,
    example: IndustryType.HOSPITAL,
  })
  @IsEnum(IndustryType)
  industry!: IndustryType;

  @ApiProperty({ description: '업종 표시 이름', example: '병원' })
  @IsString()
  display_name!: string;

  @ApiProperty({
    description: '문의 유형 정의 (JSON)',
    example: { types: ['예약', '상담', '문의'] },
  })
  @IsObject()
  inquiry_types!: Record<string, any>;

  @ApiProperty({
    description: 'AI System Prompt',
    example: '당신은 병원 고객 문의를 처리하는 AI 어시스턴트입니다.',
  })
  @IsString()
  system_prompt!: string;

  @ApiProperty({
    description: '정보 추출 스키마 (JSON)',
    example: { fields: ['name', 'phone', 'date'] },
  })
  @IsObject()
  extraction_schema!: Record<string, any>;

  @ApiProperty({
    description: '기본 템플릿 (JSON, 선택)',
    example: { welcome: '안녕하세요', closing: '감사합니다' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  default_templates?: Record<string, any>;
}
