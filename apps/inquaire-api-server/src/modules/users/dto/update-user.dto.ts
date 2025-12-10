import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ description: '이메일', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: '이름', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '연락처', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}
