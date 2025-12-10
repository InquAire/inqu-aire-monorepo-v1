import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { JsonValue } from '@/common/types/json.type';

export class CreateInquiryDto {
  @ApiProperty({
    description: '사업체 ID',
    example: 'bus-a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  business_id!: string;

  @ApiProperty({
    description: '채널 ID',
    example: 'ch-12345678-90ab-cdef-1234-567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  channel_id!: string;

  @ApiProperty({
    description: '고객 ID',
    example: 'cust-abcdef12-3456-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  customer_id!: string;

  @ApiProperty({
    description: '메시지 텍스트',
    example: '안녕하세요, 예약 문의 드립니다. 이번 주 토요일 오전 10시 가능할까요?',
  })
  @IsString()
  @IsNotEmpty()
  message_text!: string;

  @ApiProperty({
    description: '플랫폼 메시지 ID',
    required: false,
    example: 'kakao_msg_123456789',
  })
  @IsOptional()
  @IsString()
  platform_message_id?: string;

  @ApiProperty({
    description: '추출된 정보 (JSON)',
    required: false,
    example: {
      desired_date: '2025-11-23',
      desired_time: '오전',
      service_type: '예약',
    },
  })
  @IsOptional()
  extracted_info?: JsonValue;
}
