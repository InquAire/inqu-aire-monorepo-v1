import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AnalyzeInquiryDto {
  @ApiProperty({
    description: '분석할 메시지 텍스트',
    example: '안녕하세요, 임플란트 상담 받고 싶은데요. 이번 주 금요일 오후 2시쯤 가능할까요?',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({
    description: '산업 유형',
    enum: [
      'HOSPITAL',
      'REAL_ESTATE',
      'DENTAL',
      'DERMATOLOGY',
      'PLASTIC_SURGERY',
      'BEAUTY_SALON',
      'ACADEMY',
      'LAW_FIRM',
      'OTHER',
    ],
    example: 'DENTAL',
  })
  @IsEnum([
    'HOSPITAL',
    'REAL_ESTATE',
    'DENTAL',
    'DERMATOLOGY',
    'PLASTIC_SURGERY',
    'BEAUTY_SALON',
    'ACADEMY',
    'LAW_FIRM',
    'OTHER',
  ])
  industryType!: string;

  @ApiProperty({
    description: '추가 컨텍스트 (선택)',
    required: false,
    example: '고객은 기존에 충치 치료를 받은 적이 있음',
  })
  @IsOptional()
  @IsString()
  context?: string;
}

export interface ExtractedInfoHospital {
  desired_date?: string;
  desired_time?: string;
  treatment_name?: string;
  concern?: string;
  customer_name?: string;
  contact?: string;
  age?: string;
  additional_info?: string;
}

export interface ExtractedInfoRealEstate {
  property_type?: string; // 아파트, 빌라, 오피스텔 등
  location?: string;
  budget?: string;
  desired_date?: string;
  rooms?: string;
  customer_name?: string;
  contact?: string;
  additional_requirements?: string;
}

export interface AnalysisResult {
  type: string; // 예약 문의, 가격 문의, 일반 문의 등
  summary: string;
  extracted_info: ExtractedInfoHospital | ExtractedInfoRealEstate | Record<string, unknown>;
  sentiment: string; // positive, neutral, negative
  urgency: string; // high, medium, low
  suggested_reply: string;
  confidence: number;
}
