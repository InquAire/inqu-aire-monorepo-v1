import { Prisma } from '@/prisma';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

import { createPaginatedResponse } from '@/common/dto/pagination.dto';
import { CACHE_TTL, CacheService } from '@/common/modules/cache/cache.service';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * 고객 생성 (프로덕션 레벨)
   */
  async create(dto: CreateCustomerDto) {
    this.logger.log('Creating customer', 'CustomersService', {
      businessId: dto.business_id,
      platform: dto.platform,
      platformUserId: dto.platform_user_id,
      hasEmail: !!dto.email,
      hasPhone: !!dto.phone,
    });

    // 사업체 존재 확인 (Read DB)
    const business = await this.prisma.read.business.findFirst({
      where: { id: dto.business_id },
    });

    if (!business || business.deleted_at) {
      throw new NotFoundException('Business not found');
    }

    // 중복 확인 (같은 사업체에서 같은 플랫폼 사용자 ID)
    const existing = await this.prisma.read.customer.findFirst({
      where: {
        business_id: dto.business_id,
        platform_user_id: dto.platform_user_id,
        platform: dto.platform,
        deleted_at: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Customer with platform_user_id ${dto.platform_user_id} already exists for this business`
      );
    }

    const now = new Date();

    // Write DB
    const customer = await this.prisma.write.customer.create({
      data: {
        business_id: dto.business_id,
        platform_user_id: dto.platform_user_id,
        platform: dto.platform,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        first_contact: now,
        last_contact: now,
        inquiry_count: 0,
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log('Customer created successfully', 'CustomersService', {
      customerId: customer.id,
      businessId: customer.business_id,
      platform: customer.platform,
      name: customer.name,
    });
    return customer;
  }

  /**
   * 고객 목록 조회 (페이지네이션 & 필터링)
   */
  async findAll(query: QueryCustomerDto) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'last_contact',
      sortOrder = 'desc',
      search,
      start_date,
      end_date,
      ...filters
    } = query;

    const skip = (page - 1) * limit;

    // 필터 조건 구성
    const where: Prisma.CustomerWhereInput = {
      deleted_at: null,
    };

    if (filters.business_id) {
      where.business_id = filters.business_id;
    }

    if (filters.platform) {
      where.platform = filters.platform;
    }

    // 날짜 범위 필터 (created_at 기준)
    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) {
        where.created_at.gte = new Date(start_date);
      }
      if (end_date) {
        // end_date를 23:59:59로 설정하여 해당 날짜 전체를 포함
        const endDateTime = new Date(end_date);
        endDateTime.setHours(23, 59, 59, 999);
        where.created_at.lte = endDateTime;
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Read DB - 전체 개수 조회
    const total = await this.prisma.read.customer.count({ where });

    // Read DB - 고객 목록 조회
    const customers = await this.prisma.read.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        _count: {
          select: {
            inquiries: {
              where: { deleted_at: null },
            },
          },
        },
      },
    });

    return createPaginatedResponse(customers, total, page, limit);
  }

  /**
   * 고객 상세 조회
   */
  async findOne(id: string) {
    // Read DB
    const customer = await this.prisma.read.customer.findFirst({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        inquiries: {
          where: { deleted_at: null },
          orderBy: { received_at: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            inquiries: {
              where: { deleted_at: null },
            },
          },
        },
      },
    });

    if (!customer || customer.deleted_at) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    return customer;
  }

  /**
   * 플랫폼 사용자 ID로 고객 찾기 또는 생성
   * ✅ Race Condition 방지: Atomic upsert 사용
   */
  async findOrCreateByPlatformUserId(
    businessId: string,
    platformUserId: string,
    platform: 'KAKAO' | 'LINE',
    name?: string
  ) {
    const now = new Date();

    // ✅ Write DB - Atomic upsert (Race Condition 방지)
    // composite unique constraint [business_id, platform, platform_user_id]를 활용
    const customer = await this.prisma.write.customer.upsert({
      where: {
        business_id_platform_platform_user_id: {
          business_id: businessId,
          platform,
          platform_user_id: platformUserId,
        },
      },
      update: {
        // 기존 고객이 있으면 이름만 업데이트 (있는 경우)
        ...(name && { name }),
      },
      create: {
        business_id: businessId,
        platform_user_id: platformUserId,
        platform,
        name,
        first_contact: now,
        last_contact: now,
        inquiry_count: 0,
      },
    });

    this.logger.debug(`Upserted customer ${customer.id} for platform_user_id: ${platformUserId}`);

    return customer;
  }

  /**
   * 플랫폼 사용자 ID로 고객 찾기
   */
  async findByPlatformUserId(
    businessId: string,
    platformUserId: string,
    platform: 'KAKAO' | 'LINE'
  ) {
    // Read DB
    return this.prisma.read.customer.findFirst({
      where: {
        business_id: businessId,
        platform_user_id: platformUserId,
        platform,
        deleted_at: null,
      },
    });
  }

  /**
   * 고객 업데이트
   */
  async update(id: string, dto: UpdateCustomerDto) {
    this.logger.log('Updating customer', 'CustomersService', {
      customerId: id,
      updateFields: Object.keys(dto),
    });

    // 존재 확인
    await this.findOne(id);

    // Write DB
    const updated = await this.prisma.write.customer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata as Prisma.InputJsonValue }),
        updated_at: new Date(),
      },
    });

    this.logger.log('Customer updated successfully', 'CustomersService', {
      customerId: id,
      businessId: updated.business_id,
      platform: updated.platform,
    });
    return updated;
  }

  /**
   * 고객의 마지막 연락 시간 업데이트
   */
  async updateLastContact(id: string) {
    // Write DB
    return this.prisma.write.customer.update({
      where: { id },
      data: {
        last_contact: new Date(),
        inquiry_count: {
          increment: 1,
        },
      },
    });
  }

  /**
   * 고객 삭제 (소프트 삭제)
   */
  async remove(id: string) {
    this.logger.log('Deleting customer', 'CustomersService', {
      customerId: id,
    });

    // 존재 확인
    await this.findOne(id);

    // 활성 문의 확인
    const activeInquiriesCount = await this.prisma.read.inquiry.count({
      where: {
        customer_id: id,
        deleted_at: null,
        status: {
          in: ['NEW', 'IN_PROGRESS'],
        },
      },
    });

    if (activeInquiriesCount > 0) {
      throw new BadRequestException(
        `Cannot delete customer with ${activeInquiriesCount} active inquiries. Please complete them first.`
      );
    }

    // Write DB
    const deleted = await this.prisma.write.customer.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });

    this.logger.log('Customer deleted successfully', 'CustomersService', {
      customerId: id,
      businessId: deleted.business_id,
    });
    return { message: 'Customer deleted successfully', id: deleted.id };
  }

  /**
   * 고객 통계 조회 (Cache Stampede 방지 적용)
   */
  async getStats(businessId: string) {
    // 캐시 키 생성
    const cacheKey = this.cacheService.generateKey('stats', 'customers', businessId);

    // ✅ getOrSet 사용: Lock 기반 캐시 갱신으로 동시 요청 시 DB 부하 방지
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Factory 함수: 캐시 미스 시에만 실행 (Lock 획득한 요청만)
        const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Read DB - Statistics
        const [total, byPlatform, recentCustomers] = await Promise.all([
          // 전체 고객 수
          this.prisma.read.customer.count({
            where: {
              business_id: businessId,
              deleted_at: null,
            },
          }),

          // 플랫폼별
          this.prisma.read.customer.groupBy({
            by: ['platform'],
            where: {
              business_id: businessId,
              deleted_at: null,
            },
            _count: true,
          }),

          // 최근 7일 신규 고객
          this.prisma.read.customer.count({
            where: {
              business_id: businessId,
              deleted_at: null,
              first_contact: {
                gte: last7Days,
              },
            },
          }),
        ]);

        this.logger.log(`Generated customer stats for business ${businessId}`, 'CustomersService');

        return {
          business_id: businessId,
          total,
          byPlatform: byPlatform.map(p => ({
            platform: p.platform,
            count: p._count,
          })),
          recentCustomers7Days: recentCustomers,
        };
      },
      CACHE_TTL.CUSTOMER_STATS // 10분 TTL
    );
  }

  /**
   * 고객 병합 (중복 제거)
   */
  async mergeCustomers(sourceId: string, targetId: string) {
    this.logger.log(`Merging customer ${sourceId} into ${targetId}`);

    const [source, target] = await Promise.all([this.findOne(sourceId), this.findOne(targetId)]);

    // 동일한 사업체인지 확인
    if (source.business_id !== target.business_id) {
      throw new BadRequestException('Customers must belong to the same business');
    }

    // Write DB - 트랜잭션으로 병합
    await this.prisma.write.$transaction(async tx => {
      // 1. source의 모든 문의를 target으로 이동
      await tx.inquiry.updateMany({
        where: { customer_id: sourceId },
        data: { customer_id: targetId },
      });

      // 2. target의 inquiry_count 업데이트
      await tx.customer.update({
        where: { id: targetId },
        data: {
          inquiry_count: {
            increment: source.inquiry_count,
          },
          // 더 오래된 first_contact 유지
          ...(source.first_contact &&
            (!target.first_contact || source.first_contact < target.first_contact) && {
              first_contact: source.first_contact,
            }),
          // 더 최근의 last_contact 유지
          ...(source.last_contact &&
            (!target.last_contact || source.last_contact > target.last_contact) && {
              last_contact: source.last_contact,
            }),
        },
      });

      // 3. source 삭제
      await tx.customer.update({
        where: { id: sourceId },
        data: { deleted_at: new Date() },
      });
    });

    this.logger.log(`Merged customer ${sourceId} into ${targetId}`);
    return this.findOne(targetId);
  }
}
