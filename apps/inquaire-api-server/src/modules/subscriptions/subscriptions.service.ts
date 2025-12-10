import { Prisma, SubscriptionStatus } from '@/prisma';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { QuerySubscriptionDto } from './dto/query-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

import { CacheService, CACHE_TTL } from '@/common/modules/cache/cache.service';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * 구독 생성
   */
  async create(dto: CreateSubscriptionDto, userId?: string) {
    this.logger.log(`Creating subscription for business: ${dto.business_id}`);

    // 사업체 존재 확인 및 권한 검증 (Read DB)
    const business = await this.prisma.read.business.findFirst({
      where: {
        id: dto.business_id,
        deleted_at: null,
      },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    // userId가 있는 경우 조직 멤버십 확인
    if (userId) {
      const hasAccess = await this.isUserMemberOfOrganization(userId, business.organization_id);
      if (!hasAccess) {
        throw new ForbiddenException('You do not have permission to create subscription for this business');
      }
    }

    // 이미 구독이 있는지 확인
    const existingSubscription = await this.prisma.read.subscription.findUnique({
      where: { business_id: dto.business_id },
    });

    if (existingSubscription) {
      throw new BadRequestException('Business already has a subscription');
    }

    // 청구 주기 계산 (현재부터 한 달)
    const now = new Date();
    const billingCycleEnd = new Date(now);
    billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1);

    // 구독 생성 (Write DB)
    const subscription = await this.prisma.write.subscription.create({
      data: {
        business_id: dto.business_id,
        plan: dto.plan,
        status: dto.trial_ends_at ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE,
        monthly_limit: dto.monthly_limit,
        current_usage: 0,
        billing_cycle_start: now,
        billing_cycle_end: billingCycleEnd,
        trial_ends_at: dto.trial_ends_at ? new Date(dto.trial_ends_at) : null,
      },
    });

    this.logger.log(`Subscription created: ${subscription.id}`);

    // 캐시 무효화
    await this.cacheService.del(`subscription:business:${dto.business_id}`);

    return subscription;
  }

  /**
   * 구독 목록 조회
   */
  async findAll(query: QuerySubscriptionDto, userId?: string) {
    const { plan, status, business_id, limit = 20, offset = 0 } = query;

    const where: Prisma.SubscriptionWhereInput = {};

    if (plan) {
      where.plan = plan;
    }

    if (status) {
      where.status = status;
    }

    if (business_id) {
      where.business_id = business_id;
    }

    // userId가 있는 경우, 해당 사용자의 사업체만 조회
    if (userId) {
      where.business_id = {
        in: await this.getUserBusinessIds(userId),
      };
    }

    const cacheKey = `subscriptions:${JSON.stringify(query)}:${userId || 'all'}`;
    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const [subscriptions, total] = await Promise.all([
      this.prisma.read.subscription.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.read.subscription.count({ where }),
    ]);

    const result = {
      data: subscriptions,
      total,
      limit,
      offset,
    };

    await this.cacheService.set(cacheKey, JSON.stringify(result), CACHE_TTL.SHORT);

    return result;
  }

  /**
   * 구독 상세 조회
   */
  async findOne(id: string, userId?: string) {
    const cacheKey = `subscription:${id}`;
    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const subscription = await this.prisma.read.subscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // 권한 확인
    if (userId) {
      const business = await this.prisma.read.business.findFirst({
        where: {
          id: subscription.business_id,
          deleted_at: null,
        },
      });

      if (business) {
        const hasAccess = await this.isUserMemberOfOrganization(userId, business.organization_id);
        if (!hasAccess) {
          throw new ForbiddenException('You do not have permission to view this subscription');
        }
      }
    }

    await this.cacheService.set(cacheKey, JSON.stringify(subscription), CACHE_TTL.MEDIUM);

    return subscription;
  }

  /**
   * 사업체별 구독 조회
   */
  async findByBusinessId(businessId: string, userId?: string) {
    // 권한 확인
    if (userId) {
      const business = await this.prisma.read.business.findFirst({
        where: {
          id: businessId,
          deleted_at: null,
        },
      });

      if (!business) {
        throw new NotFoundException('Business not found');
      }

      const hasAccess = await this.isUserMemberOfOrganization(userId, business.organization_id);
      if (!hasAccess) {
        throw new ForbiddenException('You do not have permission to view this subscription');
      }
    }

    const cacheKey = `subscription:business:${businessId}`;
    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const subscription = await this.prisma.read.subscription.findUnique({
      where: { business_id: businessId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found for this business');
    }

    await this.cacheService.set(cacheKey, JSON.stringify(subscription), CACHE_TTL.MEDIUM);

    return subscription;
  }

  /**
   * 구독 업데이트
   */
  async update(id: string, dto: UpdateSubscriptionDto, userId?: string) {
    this.logger.log(`Updating subscription: ${id}`);

    const subscription = await this.prisma.read.subscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // 권한 확인
    if (userId) {
      const business = await this.prisma.read.business.findFirst({
        where: {
          id: subscription.business_id,
          deleted_at: null,
        },
      });

      if (business) {
        const hasAccess = await this.isUserMemberOfOrganization(userId, business.organization_id);
        if (!hasAccess) {
          throw new ForbiddenException('You do not have permission to update this subscription');
        }
      }
    }

    const updated = await this.prisma.write.subscription.update({
      where: { id },
      data: dto,
    });

    this.logger.log(`Subscription updated: ${id}`);

    // 캐시 무효화
    await this.cacheService.del(`subscription:${id}`);
    await this.cacheService.del(`subscription:business:${subscription.business_id}`);

    return updated;
  }

  /**
   * 구독 취소
   */
  async cancel(id: string, userId?: string) {
    this.logger.log(`Canceling subscription: ${id}`);

    const subscription = await this.prisma.read.subscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // 권한 확인
    if (userId) {
      const business = await this.prisma.read.business.findFirst({
        where: {
          id: subscription.business_id,
          deleted_at: null,
        },
      });

      if (business) {
        const hasAccess = await this.isUserMemberOfOrganization(userId, business.organization_id);
        if (!hasAccess) {
          throw new ForbiddenException('You do not have permission to cancel this subscription');
        }
      }
    }

    const updated = await this.prisma.write.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceled_at: new Date(),
      },
    });

    this.logger.log(`Subscription canceled: ${id}`);

    // 캐시 무효화
    await this.cacheService.del(`subscription:${id}`);
    await this.cacheService.del(`subscription:business:${subscription.business_id}`);

    return updated;
  }

  /**
   * 사용량 증가
   */
  async incrementUsage(businessId: string) {
    const subscription = await this.prisma.read.subscription.findUnique({
      where: { business_id: businessId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found for this business');
    }

    const updated = await this.prisma.write.subscription.update({
      where: { business_id: businessId },
      data: {
        current_usage: {
          increment: 1,
        },
      },
    });

    // 캐시 무효화
    await this.cacheService.del(`subscription:${subscription.id}`);
    await this.cacheService.del(`subscription:business:${businessId}`);

    return updated;
  }

  /**
   * 청구 주기 리셋
   */
  async resetBillingCycle(id: string) {
    this.logger.log(`Resetting billing cycle for subscription: ${id}`);

    const subscription = await this.prisma.read.subscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const now = new Date();
    const billingCycleEnd = new Date(now);
    billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1);

    const updated = await this.prisma.write.subscription.update({
      where: { id },
      data: {
        current_usage: 0,
        billing_cycle_start: now,
        billing_cycle_end: billingCycleEnd,
      },
    });

    this.logger.log(`Billing cycle reset for subscription: ${id}`);

    // 캐시 무효화
    await this.cacheService.del(`subscription:${id}`);
    await this.cacheService.del(`subscription:business:${subscription.business_id}`);

    return updated;
  }

  /**
   * 구독 통계 조회
   */
  async getStats() {
    const cacheKey = 'subscriptions:stats';
    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const [total, byPlan, byStatus] = await Promise.all([
      this.prisma.read.subscription.count(),
      this.prisma.read.subscription.groupBy({
        by: ['plan'],
        _count: true,
      }),
      this.prisma.read.subscription.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const stats = {
      total,
      by_plan: byPlan,
      by_status: byStatus,
    };

    await this.cacheService.set(cacheKey, JSON.stringify(stats), CACHE_TTL.SHORT);

    return stats;
  }

  /**
   * 사용자의 사업체 ID 목록 조회 (헬퍼 메서드)
   * 사용자가 속한 조직의 모든 사업체 ID를 반환
   */
  private async getUserBusinessIds(userId: string): Promise<string[]> {
    // 사용자가 속한 조직 ID 목록 조회
    const memberships = await this.prisma.read.organizationMember.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    });

    const organizationIds = memberships.map(m => m.organization_id);

    if (organizationIds.length === 0) {
      return [];
    }

    // 해당 조직들의 사업체 ID 목록 조회
    const businesses = await this.prisma.read.business.findMany({
      where: {
        organization_id: { in: organizationIds },
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });

    return businesses.map(b => b.id);
  }

  /**
   * 사용자가 조직의 멤버인지 확인 (헬퍼 메서드)
   */
  private async isUserMemberOfOrganization(
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    const member = await this.prisma.read.organizationMember.findFirst({
      where: {
        user_id: userId,
        organization_id: organizationId,
        deleted_at: null,
      },
    });
    return member !== null;
  }
}
