import { UserRole } from '@/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty({ description: '변경할 역할', enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;
}
