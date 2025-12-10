import { IndustryType } from '@/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateBusinessDto {
  @ApiProperty({
    description: '소속 조직 ID',
    example: 'org-12345678-90ab-cdef-1234-567890abcdef',
  })
  @IsUUID()
  @IsNotEmpty()
  organization_id!: string;

  @ApiProperty({
    description: '사업체명 (지점명)',
    example: '서울메디컬치과 강남점',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: '산업 유형',
    enum: IndustryType,
    example: 'DENTAL',
  })
  @IsEnum(IndustryType)
  industry_type!: IndustryType;

  @ApiProperty({
    description: '전화번호',
    required: false,
    example: '02-1234-5678',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: '주소',
    required: false,
    example: '서울특별시 강남구 테헤란로 123',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: '웹사이트',
    required: false,
    example: 'https://www.seoulmedical.com',
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({
    description: '사업체 설정 (영업시간, 자동응답 등)',
    required: false,
    example: {
      business_hours: {
        mon: { open: '09:00', close: '18:00' },
        tue: { open: '09:00', close: '18:00' },
      },
      auto_reply: true,
    },
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
