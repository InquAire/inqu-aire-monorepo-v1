import { PaymentStatus, Prisma } from '@/prisma';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

import { CacheService, CACHE_TTL } from '@/common/modules/cache/cache.service';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * 결제 생성
   */
  async create(dto: CreatePaymentDto, userId?: string) {
    this.logger.log(`Creating payment for business: ${dto.business_id}`);

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
        throw new ForbiddenException('You do not have permission to create payment for this business');
      }
    }

    // 구독 ID가 있는 경우 구독 존재 확인
    if (dto.subscription_id) {
      const subscription = await this.prisma.read.subscription.findUnique({
        where: { id: dto.subscription_id },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found');
      }

      if (subscription.business_id !== dto.business_id) {
        throw new ForbiddenException('Subscription does not belong to this business');
      }
    }

    // 결제 생성 (Write DB)
    const payment = await this.prisma.write.payment.create({
      data: {
        business_id: dto.business_id,
        subscription_id: dto.subscription_id,
        amount: dto.amount,
        currency: dto.currency || 'KRW',
        status: PaymentStatus.PENDING,
        payment_method: dto.payment_method,
      },
    });

    this.logger.log(`Payment created: ${payment.id}`);

    return payment;
  }

  /**
   * 결제 목록 조회
   */
  async findAll(query: QueryPaymentDto, userId?: string) {
    const { status, business_id, subscription_id, limit = 20, offset = 0 } = query;

    const where: Prisma.PaymentWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (business_id) {
      where.business_id = business_id;
    }

    if (subscription_id) {
      where.subscription_id = subscription_id;
    }

    // userId가 있는 경우, 해당 사용자의 사업체만 조회
    if (userId) {
      where.business_id = {
        in: await this.getUserBusinessIds(userId),
      };
    }

    const cacheKey = `payments:${JSON.stringify(query)}:${userId || 'all'}`;
    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const [payments, total] = await Promise.all([
      this.prisma.read.payment.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.read.payment.count({ where }),
    ]);

    const result = {
      data: payments,
      total,
      limit,
      offset,
    };

    await this.cacheService.set(cacheKey, JSON.stringify(result), CACHE_TTL.SHORT);

    return result;
  }

  /**
   * 결제 상세 조회
   */
  async findOne(id: string, userId?: string) {
    const cacheKey = `payment:${id}`;
    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const payment = await this.prisma.read.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // 권한 확인
    if (userId) {
      const business = await this.prisma.read.business.findFirst({
        where: {
          id: payment.business_id,
          deleted_at: null,
        },
      });

      if (business) {
        const hasAccess = await this.isUserMemberOfOrganization(userId, business.organization_id);
        if (!hasAccess) {
          throw new ForbiddenException('You do not have permission to view this payment');
        }
      }
    }

    await this.cacheService.set(cacheKey, JSON.stringify(payment), CACHE_TTL.MEDIUM);

    return payment;
  }

  /**
   * 결제 업데이트
   */
  async update(id: string, dto: UpdatePaymentDto, userId?: string) {
    this.logger.log(`Updating payment: ${id}`);

    const payment = await this.prisma.read.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // 권한 확인
    if (userId) {
      const business = await this.prisma.read.business.findFirst({
        where: {
          id: payment.business_id,
          deleted_at: null,
        },
      });

      if (business) {
        const hasAccess = await this.isUserMemberOfOrganization(userId, business.organization_id);
        if (!hasAccess) {
          throw new ForbiddenException('You do not have permission to update this payment');
        }
      }
    }

    const updateData: Prisma.PaymentUpdateInput = {
      ...dto,
    };

    // 상태에 따른 시간 필드 업데이트
    if (dto.status === PaymentStatus.COMPLETED) {
      updateData.paid_at = new Date();
    } else if (dto.status === PaymentStatus.FAILED) {
      updateData.failed_at = new Date();
    }

    const updated = await this.prisma.write.payment.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Payment updated: ${id}`);

    // 캐시 무효화
    await this.cacheService.del(`payment:${id}`);

    return updated;
  }

  /**
   * 결제 확인 (외부 PG사 연동 시뮬레이션)
   */
  async confirm(id: string, paymentKey: string, userId?: string) {
    this.logger.log(`Confirming payment: ${id} with key: ${paymentKey}`);

    const payment = await this.prisma.read.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // 권한 확인
    if (userId) {
      const business = await this.prisma.read.business.findFirst({
        where: {
          id: payment.business_id,
          deleted_at: null,
        },
      });

      if (business) {
        const hasAccess = await this.isUserMemberOfOrganization(userId, business.organization_id);
        if (!hasAccess) {
          throw new ForbiddenException('You do not have permission to confirm this payment');
        }
      }
    }

    // 실제 PG사 연동은 향후 구현 (Toss Payments, Stripe 등)
    // 여기서는 시뮬레이션으로 처리
    const updated = await this.prisma.write.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.COMPLETED,
        payment_key: paymentKey,
        paid_at: new Date(),
      },
    });

    this.logger.log(`Payment confirmed: ${id}`);

    // 캐시 무효화
    await this.cacheService.del(`payment:${id}`);

    return updated;
  }

  /**
   * 결제 통계 조회
   */
  async getStats() {
    const cacheKey = 'payments:stats';
    const cached = await this.cacheService.get<string>(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const [total, byStatus, totalAmount] = await Promise.all([
      this.prisma.read.payment.count(),
      this.prisma.read.payment.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.read.payment.aggregate({
        where: { status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
      }),
    ]);

    const stats = {
      total,
      by_status: byStatus,
      total_amount: totalAmount._sum.amount || 0,
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
