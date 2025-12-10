import { UserRole } from '@/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryUserDto {
  @ApiProperty({ description: '검색 키워드 (이름, 이메일)', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: '역할 필터', enum: UserRole, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ description: '삭제된 사용자 포함', default: false, required: false })
  @IsOptional()
  @Type(() => Boolean)
  include_deleted?: boolean = false;

  @ApiProperty({ description: '페이지 크기', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({ description: '오프셋', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
