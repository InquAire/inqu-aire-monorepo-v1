import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { SenderType } from '@/prisma';

export class CreateInquiryReplyDto {
  @ApiProperty({ description: '문의 ID' })
  @IsString()
  inquiry_id!: string;

  @ApiProperty({
    description: '답변 메시지',
    example: '안녕하세요, 문의 주셔서 감사합니다.',
  })
  @IsString()
  message_text!: string;

  @ApiProperty({
    description: '발신자 유형',
    enum: SenderType,
    example: SenderType.HUMAN,
  })
  @IsEnum(SenderType)
  sender_type!: SenderType;

  @ApiProperty({
    description: '발신자 ID (관리자 ID, HUMAN인 경우 필수)',
    required: false,
  })
  @IsOptional()
  @IsString()
  sender_id?: string;

  @ApiProperty({
    description: '전송 완료 여부',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_sent?: boolean;
}
