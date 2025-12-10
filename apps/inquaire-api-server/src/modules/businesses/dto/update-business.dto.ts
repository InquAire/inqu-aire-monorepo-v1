import { IndustryType } from '@/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateBusinessDto {
  @ApiProperty({ description: '사업체명', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: '산업 유형',
    enum: IndustryType,
    required: false,
  })
  @IsOptional()
  @IsEnum(IndustryType)
  industry_type?: IndustryType;

  @ApiProperty({ description: '사업자 등록번호', required: false })
  @IsOptional()
  @IsString()
  business_registration_number?: string;

  @ApiProperty({ description: '전화번호', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: '이메일', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: '주소', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: '웹사이트', required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ description: '메타데이터 (JSON)', required: false })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: '사업체 설정 (JSON)',
    required: false,
    example: { autoReply: true, notificationEnabled: true },
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
