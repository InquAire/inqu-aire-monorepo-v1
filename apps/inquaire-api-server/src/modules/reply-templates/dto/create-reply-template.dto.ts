import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateReplyTemplateDto {
  @ApiProperty({ description: '사업체 ID' })
  @IsString()
  business_id!: string;

  @ApiProperty({ description: '템플릿 이름', example: '환영 메시지' })
  @IsString()
  name!: string;

  @ApiProperty({
    description: '문의 유형 (선택)',
    example: '문의',
    required: false,
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({
    description: '템플릿 내용',
    example: '안녕하세요 {{customer_name}}님, 문의 주셔서 감사합니다.',
  })
  @IsString()
  content!: string;

  @ApiProperty({
    description: '사용 가능한 변수 목록',
    example: ['customer_name', 'business_name', 'inquiry_type'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiProperty({
    description: '활성 상태',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
