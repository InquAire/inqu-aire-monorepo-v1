import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * 사업체 목록 조회 Query DTO
 * organization_id 필수, user_id는 권한 확인용
 */
export class BusinessListQueryDto {
  @ApiProperty({
    description: '조직 ID (필수)',
    example: 'org-12345678-90ab-cdef-1234-567890abcdef',
  })
  @IsUUID()
  @IsNotEmpty()
  organization_id!: string;

  @ApiPropertyOptional({
    description: '사용자 ID (권한 확인용)',
    example: 'user-12345678-90ab-cdef-1234-567890abcdef',
  })
  @IsOptional()
  @IsString()
  user_id?: string;
}

/**
 * 사업체 생성 Query DTO
 */
export class BusinessCreateQueryDto {
  @ApiProperty({
    description: '사용자 ID (필수)',
    example: 'user-12345678-90ab-cdef-1234-567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  user_id!: string;
}

/**
 * 사업체 상세/수정/삭제 Query DTO
 */
export class BusinessDetailQueryDto {
  @ApiPropertyOptional({
    description: '사용자 ID (권한 확인용)',
    example: 'user-12345678-90ab-cdef-1234-567890abcdef',
  })
  @IsOptional()
  @IsString()
  user_id?: string;
}

// 하위 호환성을 위한 alias
export { BusinessCreateQueryDto as RequiredUserIdQueryDto };
export { BusinessDetailQueryDto as OptionalUserIdQueryDto };
