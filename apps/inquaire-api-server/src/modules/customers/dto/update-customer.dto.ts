import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateCustomerDto {
  @ApiProperty({ description: '고객 이름', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '전화번호', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: '이메일', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: '메모', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: '태그 (JSON 배열)', required: false })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ description: '메타데이터 (JSON)', required: false })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
