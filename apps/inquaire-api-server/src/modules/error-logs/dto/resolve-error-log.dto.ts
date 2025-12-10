import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ResolveErrorLogDto {
  @ApiProperty({
    description: '해결 여부',
    example: true,
  })
  @IsBoolean()
  resolved!: boolean;
}
