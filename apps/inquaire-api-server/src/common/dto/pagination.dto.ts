import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * 페이지네이션 Query DTO
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: '페이지 번호 (1부터 시작)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: '페이지당 항목 수',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}

/**
 * 페이지네이션 메타데이터
 */
export class PaginationMeta {
  @ApiProperty({ description: '현재 페이지', example: 1 })
  page: number;

  @ApiProperty({ description: '페이지당 항목 수', example: 20 })
  limit: number;

  @ApiProperty({ description: '전체 항목 수', example: 150 })
  total: number;

  @ApiProperty({ description: '전체 페이지 수', example: 8 })
  totalPages: number;

  @ApiProperty({ description: '다음 페이지 존재 여부', example: true })
  hasNext: boolean;

  @ApiProperty({ description: '이전 페이지 존재 여부', example: false })
  hasPrev: boolean;

  constructor(page: number, limit: number, total: number) {
    this.page = page;
    this.limit = limit;
    this.total = total;
    this.totalPages = Math.ceil(total / limit);
    this.hasNext = page < this.totalPages;
    this.hasPrev = page > 1;
  }
}

/**
 * 페이지네이션 응답 DTO
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({ description: '성공 여부', example: true })
  success: boolean;

  @ApiProperty({ description: '데이터 배열', isArray: true })
  data: T[];

  @ApiProperty({ description: '페이지네이션 메타데이터', type: PaginationMeta })
  pagination: PaginationMeta;

  constructor(data: T[], pagination: PaginationMeta) {
    this.success = true;
    this.data = data;
    this.pagination = pagination;
  }
}

/**
 * 페이지네이션 헬퍼 함수
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponseDto<T> {
  const pagination = new PaginationMeta(page, limit, total);
  return new PaginatedResponseDto(data, pagination);
}

/**
 * Prisma skip/take 계산
 */
export function getPaginationParams(page: number, limit: number): { skip: number; take: number } {
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}
