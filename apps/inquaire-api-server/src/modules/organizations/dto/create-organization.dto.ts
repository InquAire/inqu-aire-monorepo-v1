import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({
    description: '조직 이름',
    example: 'Acme Corporation',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: '조직 슬러그 (URL-friendly identifier)',
    example: 'acme-corp',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must contain only lowercase letters, numbers, and hyphens',
  })
  @MinLength(3)
  @MaxLength(50)
  slug?: string;

  @ApiPropertyOptional({
    description: '조직 로고 URL',
    example: 'https://example.com/logo.png',
  })
  @IsOptional()
  @IsString()
  logo_url?: string;

  @ApiPropertyOptional({
    description: '조직 설명',
    example: '글로벌 AI 솔루션 기업',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
