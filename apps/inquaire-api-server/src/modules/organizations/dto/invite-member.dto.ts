import { OrganizationRole } from '@/prisma';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export class InviteMemberDto {
  @ApiProperty({
    description: '초대할 사용자 이메일',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: '부여할 역할',
    enum: OrganizationRole,
    default: OrganizationRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(OrganizationRole)
  role?: OrganizationRole = OrganizationRole.MEMBER;
}
