import { OrganizationRole } from '@/prisma';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateMemberRoleDto {
  @ApiProperty({
    description: '변경할 역할',
    enum: OrganizationRole,
  })
  @IsNotEmpty()
  @IsEnum(OrganizationRole)
  role!: OrganizationRole;
}
