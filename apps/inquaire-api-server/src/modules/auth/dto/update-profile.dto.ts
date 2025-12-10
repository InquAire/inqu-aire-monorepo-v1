import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    description: '사용자 이름',
    required: false,
    example: '홍길동',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: '이메일',
    required: false,
    example: 'user@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: '연락처',
    required: false,
    example: '010-1234-5678',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
