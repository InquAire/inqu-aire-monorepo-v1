import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { SenderType } from '@/prisma';

export class QueryInquiryReplyDto {
  @ApiProperty({ description: '문의 ID 필터', required: false })
  @IsOptional()
  @IsString()
  inquiry_id?: string;

  @ApiProperty({
    description: '발신자 유형 필터',
    enum: SenderType,
    required: false,
  })
  @IsOptional()
  @IsEnum(SenderType)
  sender_type?: SenderType;

  @ApiProperty({ description: '전송 완료 여부 필터', required: false })
  @IsOptional()
  @IsBoolean()
  is_sent?: boolean;

  @ApiProperty({ description: '페이지 크기', example: 20, required: false })
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiProperty({ description: '오프셋', example: 0, required: false })
  @IsOptional()
  @IsNumberString()
  offset?: string;
}
