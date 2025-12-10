import { UserRole } from '@/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: '비밀번호 (최소 8자)', example: 'password123' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ description: '이름', example: '홍길동' })
  @IsString()
  name!: string;

  @ApiProperty({ description: '연락처 (옵션)', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: '역할', enum: UserRole, default: UserRole.USER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole = UserRole.USER;
}
