import { UserRole } from '@/prisma';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';

import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

import { ResourceOwnershipGuard } from '@/common/guards/resource-ownership.guard';

@ApiTags('users')
@Controller('users')
@UseGuards(ResourceOwnershipGuard)
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN) // 기본적으로 ADMIN 이상만 접근
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: '사용자 생성 (ADMIN 전용)' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: '사용자 목록 조회 (ADMIN 전용)' })
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: '사용자 통계 조회 (ADMIN 전용)' })
  getStats() {
    return this.usersService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: '사용자 상세 조회' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '사용자 업데이트 (ADMIN 전용)' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/role')
  @Roles(UserRole.SUPER_ADMIN) // 역할 변경은 SUPER_ADMIN만 가능
  @ApiOperation({ summary: '사용자 역할 변경 (SUPER_ADMIN 전용)' })
  updateRole(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.usersService.updateRole(id, updateRoleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '사용자 삭제 (ADMIN 전용)' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
