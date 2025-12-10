import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

import { IsStrongPassword } from '@/common/validators/strong-password.validator';

export class SignupDto {
  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: '비밀번호 (최소 8자, 대문자, 소문자, 숫자, 특수문자 포함)',
    example: 'MyP@ssw0rd',
  })
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  password!: string;

  @ApiProperty({ description: '이름', example: '홍길동' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
