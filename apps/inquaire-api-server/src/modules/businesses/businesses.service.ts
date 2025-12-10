import { Prisma } from '@/prisma';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

import { CacheService, CACHE_TTL } from '@/common/modules/cache/cache.service';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

@Injectable()
export class BusinessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * 사업체(지점) 생성
   */
  async create(dto: CreateBusinessDto, userId: string) {
    this.logger.log(`Creating business: ${dto.name} for organization: ${dto.organization_id}`);

    // 조직 존재 확인 및 사용자 멤버십 확인 (Read DB)
    const organization = await this.prisma.read.organization.findFirst({
      where: { id: dto.organization_id, deleted_at: null },
      include: {
        members: {
          where: { user_id: userId, deleted_at: null },
        },
        subscription: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // 사용자가 조직의 멤버인지 확인
    const member = organization.members[0];
    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // 권한 확인 (OWNER, ADMIN, MANAGER만 사업체 생성 가능)
    if (!['OWNER', 'ADMIN', 'MANAGER'].includes(member.role)) {
      throw new ForbiddenException('You do not have permission to create businesses');
    }

    // 구독 플랜의 사업체 수 제한 확인
    if (organization.subscription) {
      const currentBusinessCount = await this.prisma.read.business.count({
        where: { organization_id: dto.organization_id, deleted_at: null },
      });

      if (currentBusinessCount >= organization.subscription.max_businesses) {
        throw new BadRequestException(
          `Business limit reached. Your plan allows ${organization.subscription.max_businesses} businesses.`
        );
      }
    }

    // 사업체 생성 (Write DB)
    const business = await this.prisma.write.business.create({
      data: {
        organization_id: dto.organization_id,
        name: dto.name,
        industry_type: dto.industry_type,
        address: dto.address,
        phone: dto.phone,
        website: dto.website,
        settings: dto.settings as Prisma.InputJsonValue,
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
    });

    this.logger.log(`Created business ${business.id} for organization ${dto.organization_id}`);
    return business;
  }

  /**
   * 사업체 목록 조회 (조직별)
   */
  async findAll(organizationId: string, _userId?: string) {
    const where: Prisma.BusinessWhereInput = {
      organization_id: organizationId,
      deleted_at: null,
    };

    // Read DB
    const businesses = await this.prisma.read.business.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            channels: {
              where: { deleted_at: null },
            },
            customers: {
              where: { deleted_at: null },
            },
            inquiries: {
              where: { deleted_at: null },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return businesses;
  }

  /**
   * 사업체 상세 조회
   */
  async findOne(id: string, userId?: string) {
    // Read DB
    const business = await this.prisma.read.business.findFirst({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            members: userId
              ? {
                  where: { user_id: userId, deleted_at: null },
                  select: { role: true, permissions: true },
                }
              : false,
          },
        },
        channels: {
          where: { deleted_at: null },
          orderBy: { created_at: 'desc' },
        },
        _count: {
          select: {
            channels: {
              where: { deleted_at: null },
            },
            customers: {
              where: { deleted_at: null },
            },
            inquiries: {
              where: { deleted_at: null },
            },
          },
        },
      },
    });

    if (!business || business.deleted_at) {
      throw new NotFoundException(`Business ${id} not found`);
    }

    // 권한 확인 (조직 멤버만 접근 가능)
    if (userId && business.organization) {
      const members = (business.organization as { members?: { role: string }[] }).members;
      if (!members || members.length === 0) {
        throw new ForbiddenException('You do not have access to this business');
      }
    }

    return business;
  }

  /**
   * 사업체 업데이트
   */
  async update(id: string, dto: UpdateBusinessDto, userId?: string) {
    this.logger.log(`Updating business ${id}`);

    // 존재 확인 및 권한 확인
    const business = await this.findOne(id, userId);

    // 권한 확인 (OWNER, ADMIN, MANAGER만 수정 가능)
    if (userId && business.organization) {
      const members = (business.organization as { members?: { role: string }[] }).members;
      if (members && members.length > 0) {
        const role = members[0].role;
        if (!['OWNER', 'ADMIN', 'MANAGER'].includes(role)) {
          throw new ForbiddenException('You do not have permission to update this business');
        }
      }
    }

    // Write DB
    const updated = await this.prisma.write.business.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.industry_type && { industry_type: dto.industry_type }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.settings !== undefined && { settings: dto.settings as Prisma.InputJsonValue }),
        updated_at: new Date(),
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
    });

    this.logger.log(`Updated business ${id}`);
    return updated;
  }

  /**
   * 사업체 삭제 (소프트 삭제)
   */
  async remove(id: string, userId?: string) {
    this.logger.log(`Deleting business ${id}`);

    // 존재 확인 및 권한 확인
    const business = await this.findOne(id, userId);

    // 권한 확인 (OWNER, ADMIN만 삭제 가능)
    if (userId && business.organization) {
      const members = (business.organization as { members?: { role: string }[] }).members;
      if (members && members.length > 0) {
        const role = members[0].role;
        if (!['OWNER', 'ADMIN'].includes(role)) {
          throw new ForbiddenException('You do not have permission to delete this business');
        }
      }
    }

    // 활성 채널 확인
    const activeChannelsCount = await this.prisma.read.channel.count({
      where: {
        business_id: id,
        deleted_at: null,
      },
    });

    if (activeChannelsCount > 0) {
      throw new BadRequestException(
        'Cannot delete business with active channels. Please delete all channels first.'
      );
    }

    // Write DB
    const deleted = await this.prisma.write.business.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });

    this.logger.log(`Deleted business ${id}`);
    return { message: 'Business deleted successfully', id: deleted.id };
  }

  /**
   * 사업체 대시보드 통계
   */
  async getDashboard(id: string, userId?: string) {
    // 존재 확인 및 권한 확인
    await this.findOne(id, userId);

    // 캐시 키 생성
    const cacheKey = this.cacheService.generateKey('dashboard', 'business', id);

    // 캐시에서 먼저 조회
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for business dashboard ${id}`);
      return cached;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Read DB - Dashboard statistics
    const [
      totalInquiries,
      todayInquiries,
      last7DaysInquiries,
      last30DaysInquiries,
      totalCustomers,
      newCustomersLast7Days,
      inquiriesByStatus,
      inquiriesBySentiment,
      topChannels,
    ] = await Promise.all([
      // 전체 문의 수
      this.prisma.read.inquiry.count({
        where: {
          business_id: id,
          deleted_at: null,
        },
      }),

      // 오늘 문의
      this.prisma.read.inquiry.count({
        where: {
          business_id: id,
          deleted_at: null,
          received_at: {
            gte: today,
          },
        },
      }),

      // 최근 7일 문의
      this.prisma.read.inquiry.count({
        where: {
          business_id: id,
          deleted_at: null,
          received_at: { gte: last7Days },
        },
      }),

      // 최근 30일 문의
      this.prisma.read.inquiry.count({
        where: {
          business_id: id,
          deleted_at: null,
          received_at: { gte: last30Days },
        },
      }),

      // 전체 고객 수
      this.prisma.read.customer.count({
        where: {
          business_id: id,
          deleted_at: null,
        },
      }),

      // 최근 7일 신규 고객
      this.prisma.read.customer.count({
        where: {
          business_id: id,
          deleted_at: null,
          first_contact: { gte: last7Days },
        },
      }),

      // 상태별 문의
      this.prisma.read.inquiry.groupBy({
        by: ['status'],
        where: {
          business_id: id,
          deleted_at: null,
        },
        _count: true,
      }),

      // 감정별 문의
      this.prisma.read.inquiry.groupBy({
        by: ['sentiment'],
        where: {
          business_id: id,
          deleted_at: null,
          sentiment: { not: null },
        },
        _count: true,
      }),

      // 채널별 문의 수 (상위 5개)
      this.prisma.read.inquiry.groupBy({
        by: ['channel_id'],
        where: {
          business_id: id,
          deleted_at: null,
        },
        _count: true,
        orderBy: {
          _count: {
            channel_id: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    // 채널 정보 가져오기 (Read DB)
    const channelIds = topChannels.map(c => c.channel_id);
    const channels = await this.prisma.read.channel.findMany({
      where: {
        id: { in: channelIds },
        deleted_at: null,
      },
      select: { id: true, name: true, platform: true },
    });

    const topChannelsWithInfo = topChannels.map(c => {
      const channel = channels.find(ch => ch.id === c.channel_id);
      return {
        channel_id: c.channel_id,
        channel_name: channel?.name || 'Unknown',
        platform: channel?.platform || 'Unknown',
        count: c._count,
      };
    });

    const stats = {
      business_id: id,
      summary: {
        total_inquiries: totalInquiries,
        today_inquiries: todayInquiries,
        last_7_days_inquiries: last7DaysInquiries,
        last_30_days_inquiries: last30DaysInquiries,
        total_customers: totalCustomers,
        new_customers_last_7_days: newCustomersLast7Days,
      },
      inquiries_by_status: inquiriesByStatus.map(s => ({
        status: s.status,
        count: s._count,
      })),
      inquiries_by_sentiment: inquiriesBySentiment.map(s => ({
        sentiment: s.sentiment,
        count: s._count,
      })),
      top_channels: topChannelsWithInfo,
    };

    // 캐시에 저장 (5분 TTL)
    await this.cacheService.set(cacheKey, stats, CACHE_TTL.DASHBOARD_STATS);

    return stats;
  }
}
