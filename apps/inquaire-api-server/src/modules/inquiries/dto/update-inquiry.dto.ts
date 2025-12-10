import { InquiryStatus } from '@/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { JsonValue } from '@/common/types/json.type';

export class UpdateInquiryDto {
  @ApiProperty({ description: '답변 텍스트', required: false })
  @IsOptional()
  @IsString()
  reply_text?: string;

  @ApiProperty({
    description: '상태',
    enum: InquiryStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(InquiryStatus)
  status?: InquiryStatus;

  @ApiProperty({ description: '요약', required: false })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ description: '문의 유형', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: '관리자 메모', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: '추출된 정보 (JSON)', required: false })
  @IsOptional()
  extracted_info?: JsonValue;
}
