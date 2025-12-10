import { Prisma } from '@/prisma';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { CACHE_TTL, CacheService } from '@/common/modules/cache/cache.service';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * 사용자 생성 (ADMIN 전용)
   */
  async create(dto: CreateUserDto) {
    this.logger.log(`Creating user: ${dto.email}`);

    // 이메일 중복 확인
    const existing = await this.prisma.read.user.findFirst({
      where: { email: dto.email, deleted_at: null },
    });

    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    // 비밀번호 해싱
    const password_hash = await bcrypt.hash(dto.password, 10);

    // 사용자 생성
    const user = await this.prisma.write.user.create({
      data: {
        email: dto.email,
        password_hash,
        name: dto.name,
        role: dto.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true,
        updated_at: true,
        last_login_at: true,
        deleted_at: true,
      },
    });

    this.logger.log(`User created: ${user.id}`);

    return user;
  }

  /**
   * 사용자 목록 조회 (ADMIN 전용)
   */
  async findAll(query: QueryUserDto) {
    const { search, role, include_deleted, limit = 20, offset = 0 } = query;

    const where: Prisma.UserWhereInput = {};

    // 검색 조건
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 역할 필터
    if (role) {
      where.role = role;
    }

    // 삭제된 사용자 포함 여부
    if (!include_deleted) {
      where.deleted_at = null;
    }

    const cacheKey = `users:${JSON.stringify(query)}`;
    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const [users, total] = await Promise.all([
      this.prisma.read.user.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          created_at: true,
          updated_at: true,
          last_login_at: true,
          deleted_at: true,
        },
      }),
      this.prisma.read.user.count({ where }),
    ]);

    const result = {
      data: users,
      total,
      limit,
      offset,
    };

    await this.cacheService.set(cacheKey, JSON.stringify(result), CACHE_TTL.SHORT);

    return result;
  }

  /**
   * 사용자 상세 조회
   */
  async findOne(id: string) {
    const cacheKey = `user:${id}`;
    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const user = await this.prisma.read.user.findFirst({
      where: { id, deleted_at: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true,
        updated_at: true,
        last_login_at: true,
        deleted_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 사용자의 조직 멤버십 조회
    const organizationMemberships = await this.prisma.read.organizationMember.findMany({
      where: {
        user_id: id,
        deleted_at: null,
        organization: {
          deleted_at: null,
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        joined_at: 'asc',
      },
    });

    const organizations = organizationMemberships.map(m => ({
      organization: m.organization,
      role: m.role,
    }));

    const result = {
      ...user,
      organizations,
    };

    await this.cacheService.set(cacheKey, JSON.stringify(result), CACHE_TTL.MEDIUM);

    return result;
  }

  /**
   * 사용자 업데이트
   */
  async update(id: string, dto: UpdateUserDto) {
    this.logger.log(`Updating user: ${id}`);

    const user = await this.prisma.read.user.findFirst({
      where: { id, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 이메일 중복 확인 (다른 사용자가 사용 중인지)
    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.read.user.findFirst({
        where: {
          email: dto.email,
          id: { not: id },
          deleted_at: null,
        },
      });

      if (existing) {
        throw new BadRequestException('Email already exists');
      }
    }

    const updated = await this.prisma.write.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true,
        updated_at: true,
        last_login_at: true,
        deleted_at: true,
      },
    });

    this.logger.log(`User updated: ${id}`);

    // 캐시 무효화
    await this.cacheService.del(`user:${id}`);

    return updated;
  }

  /**
   * 사용자 역할 변경 (SUPER_ADMIN 전용)
   */
  async updateRole(id: string, dto: UpdateRoleDto) {
    this.logger.log(`Updating user role: ${id} to ${dto.role}`);

    const user = await this.prisma.read.user.findFirst({
      where: { id, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.write.user.update({
      where: { id },
      data: { role: dto.role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true,
        updated_at: true,
        last_login_at: true,
        deleted_at: true,
      },
    });

    this.logger.log(`User role updated: ${id}`);

    // 캐시 무효화
    await this.cacheService.del(`user:${id}`);

    return updated;
  }

  /**
   * 사용자 삭제 (소프트 삭제)
   */
  async remove(id: string) {
    this.logger.log(`Deleting user: ${id}`);

    const user = await this.prisma.read.user.findFirst({
      where: { id, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const deleted = await this.prisma.write.user.update({
      where: { id },
      data: { deleted_at: new Date() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true,
        updated_at: true,
        last_login_at: true,
        deleted_at: true,
      },
    });

    this.logger.log(`User deleted: ${id}`);

    // 캐시 무효화
    await this.cacheService.del(`user:${id}`);

    return deleted;
  }

  /**
   * 사용자 통계 조회
   */
  async getStats() {
    const cacheKey = 'users:stats';
    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const [total, byRole, active] = await Promise.all([
      this.prisma.read.user.count({ where: { deleted_at: null } }),
      this.prisma.read.user.groupBy({
        by: ['role'],
        where: { deleted_at: null },
        _count: true,
      }),
      this.prisma.read.user.count({
        where: {
          deleted_at: null,
          last_login_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30일 이내
          },
        },
      }),
    ]);

    const stats = {
      total,
      by_role: byRole,
      active_last_30_days: active,
    };

    await this.cacheService.set(cacheKey, JSON.stringify(stats), CACHE_TTL.SHORT);

    return stats;
  }
}
