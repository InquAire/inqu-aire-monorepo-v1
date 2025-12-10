import { Prisma } from '@/prisma';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

import { EncryptionService } from '@/common/modules/encryption/encryption.service';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly logger: CustomLoggerService,
    private readonly encryptionService: EncryptionService
  ) {}

  /**
   * 채널 생성 (프로덕션 레벨)
   */
  async create(dto: CreateChannelDto) {
    this.logger.log(`Creating ${dto.platform} channel for business ${dto.business_id}`);

    // 사업체 존재 확인 (Read DB)
    const business = await this.prisma.read.business.findFirst({
      where: { id: dto.business_id },
    });

    if (!business || business.deleted_at) {
      throw new NotFoundException('Business not found');
    }

    // 중복 확인 (같은 사업체에서 같은 플랫폼 채널 ID)
    const existing = await this.prisma.read.channel.findFirst({
      where: {
        business_id: dto.business_id,
        platform_channel_id: dto.platform_channel_id,
        deleted_at: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Channel with platform_channel_id ${dto.platform_channel_id} already exists for this business`
      );
    }

    // Webhook URL 생성
    const webhookBaseUrl = this.configService.get<string>('WEBHOOK_BASE_URL');

    // 토큰 암호화
    const encryptedAccessToken = dto.access_token
      ? this.encryptionService.encrypt(dto.access_token)
      : null;
    const encryptedRefreshToken = dto.refresh_token
      ? this.encryptionService.encrypt(dto.refresh_token)
      : null;

    // Write DB - 트랜잭션으로 채널 생성 및 URL 업데이트
    const channel = await this.prisma.write.$transaction(async tx => {
      // 1. 채널 생성 (암호화된 토큰 저장)
      const newChannel = await tx.channel.create({
        data: {
          business_id: dto.business_id,
          platform: dto.platform,
          platform_channel_id: dto.platform_channel_id,
          name: dto.name,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          auto_reply_enabled: dto.auto_reply_enabled ?? true,
          is_active: true,
        },
      });

      // 2. Webhook URL 생성 및 업데이트
      const webhookUrl = `${webhookBaseUrl}/webhooks/${dto.platform.toLowerCase()}/${newChannel.id}`;

      const updated = await tx.channel.update({
        where: { id: newChannel.id },
        data: { webhook_url: webhookUrl },
        include: {
          business: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return updated;
    });

    this.logger.log(`Created channel ${channel.id} with webhook URL: ${channel.webhook_url}`);
    return channel;
  }

  /**
   * 채널 목록 조회
   */
  async findAll(businessId?: string, platform?: 'KAKAO' | 'LINE', search?: string) {
    const where: Prisma.ChannelWhereInput = {
      deleted_at: null,
    };

    if (businessId) {
      where.business_id = businessId;
    }

    if (platform) {
      where.platform = platform;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { platform_channel_id: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Read DB
    const channels = await this.prisma.read.channel.findMany({
      where,
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
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

    return channels;
  }

  /**
   * 채널 상세 조회
   */
  async findOne(id: string) {
    // Read DB
    const channel = await this.prisma.read.channel.findFirst({
      where: { id },
      include: {
        business: true,
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

    if (!channel || channel.deleted_at) {
      throw new NotFoundException(`Channel ${id} not found`);
    }

    return channel;
  }

  /**
   * 플랫폼 채널 ID로 채널 찾기
   */
  async findByPlatformChannelId(
    businessId: string,
    platformChannelId: string,
    platform: 'KAKAO' | 'LINE'
  ) {
    return this.prisma.read.channel.findFirst({
      where: {
        business_id: businessId,
        platform_channel_id: platformChannelId,
        platform,
        deleted_at: null,
      },
    });
  }

  /**
   * 채널 업데이트
   */
  async update(id: string, dto: UpdateChannelDto) {
    this.logger.log(`Updating channel ${id}`);

    // 존재 확인
    await this.findOne(id);

    // 토큰 암호화 (제공된 경우에만)
    const encryptedAccessToken = dto.access_token
      ? this.encryptionService.encrypt(dto.access_token)
      : undefined;
    const encryptedRefreshToken = dto.refresh_token
      ? this.encryptionService.encrypt(dto.refresh_token)
      : undefined;

    // Write DB
    const updated = await this.prisma.write.channel.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(encryptedAccessToken !== undefined && { access_token: encryptedAccessToken }),
        ...(encryptedRefreshToken !== undefined && { refresh_token: encryptedRefreshToken }),
        ...(dto.auto_reply_enabled !== undefined && {
          auto_reply_enabled: dto.auto_reply_enabled,
        }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        updated_at: new Date(),
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

    this.logger.log(`Updated channel ${id}`);
    return updated;
  }

  /**
   * 채널 삭제 (소프트 삭제)
   */
  async remove(id: string) {
    this.logger.log(`Deleting channel ${id}`);

    // 존재 확인
    await this.findOne(id);

    // 활성 문의 확인
    const activeInquiriesCount = await this.prisma.read.inquiry.count({
      where: {
        channel_id: id,
        deleted_at: null,
        status: {
          in: ['NEW', 'IN_PROGRESS'],
        },
      },
    });

    if (activeInquiriesCount > 0) {
      throw new BadRequestException(
        `Cannot delete channel with ${activeInquiriesCount} active inquiries. Please complete or cancel them first.`
      );
    }

    // Write DB
    const deleted = await this.prisma.write.channel.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        is_active: false,
      },
    });

    this.logger.log(`Deleted channel ${id}`);
    return { message: 'Channel deleted successfully', id: deleted.id };
  }

  /**
   * 채널 활성화/비활성화
   */
  async toggleActive(id: string) {
    const channel = await this.findOne(id);

    // Write DB
    const updated = await this.prisma.write.channel.update({
      where: { id },
      data: {
        is_active: !channel.is_active,
        updated_at: new Date(),
      },
    });

    this.logger.log(`Toggled channel ${id} active status to ${updated.is_active}`);
    return updated;
  }

  /**
   * 자동 응답 활성화/비활성화
   */
  async toggleAutoReply(id: string) {
    const channel = await this.findOne(id);

    // Write DB
    const updated = await this.prisma.write.channel.update({
      where: { id },
      data: {
        auto_reply_enabled: !channel.auto_reply_enabled,
        updated_at: new Date(),
      },
    });

    this.logger.log(`Toggled channel ${id} auto-reply to ${updated.auto_reply_enabled}`);
    return updated;
  }

  /**
   * 채널 통계 조회
   */
  async getStats(id: string) {
    const channel = await this.findOne(id);

    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Read DB - Statistics
    const [totalInquiries, byStatus, recentInquiries] = await Promise.all([
      // 전체 문의 수
      this.prisma.read.inquiry.count({
        where: {
          channel_id: id,
          deleted_at: null,
        },
      }),

      // 상태별
      this.prisma.read.inquiry.groupBy({
        by: ['status'],
        where: {
          channel_id: id,
          deleted_at: null,
        },
        _count: true,
      }),

      // 최근 7일 문의
      this.prisma.read.inquiry.count({
        where: {
          channel_id: id,
          deleted_at: null,
          received_at: {
            gte: last7Days,
          },
        },
      }),
    ]);

    return {
      channel_id: id,
      channel_name: channel.name,
      platform: channel.platform,
      is_active: channel.is_active,
      auto_reply_enabled: channel.auto_reply_enabled,
      total_inquiries: totalInquiries,
      by_status: byStatus.map(s => ({ status: s.status, count: s._count })),
      recent_inquiries_7_days: recentInquiries,
    };
  }

  /**
   * Webhook URL 재생성
   */
  async regenerateWebhookUrl(id: string) {
    const channel = await this.findOne(id);

    const webhookBaseUrl = this.configService.get<string>('WEBHOOK_BASE_URL');
    const webhookUrl = `${webhookBaseUrl}/webhooks/${channel.platform.toLowerCase()}/${id}`;

    // Write DB
    const updated = await this.prisma.write.channel.update({
      where: { id },
      data: {
        webhook_url: webhookUrl,
        updated_at: new Date(),
      },
    });

    this.logger.log(`Regenerated webhook URL for channel ${id}: ${webhookUrl}`);
    return updated;
  }

  /**
   * 채널 토큰 갱신
   */
  async updateTokens(id: string, accessToken: string, refreshToken?: string) {
    this.logger.log(`Updating tokens for channel ${id}`);

    // 존재 확인
    await this.findOne(id);

    // 토큰 암호화
    const encryptedAccessToken = this.encryptionService.encrypt(accessToken);
    const encryptedRefreshToken = refreshToken
      ? this.encryptionService.encrypt(refreshToken)
      : undefined;

    // Write DB
    const updated = await this.prisma.write.channel.update({
      where: { id },
      data: {
        access_token: encryptedAccessToken,
        ...(encryptedRefreshToken && { refresh_token: encryptedRefreshToken }),
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일 후
        last_synced_at: new Date(),
        updated_at: new Date(),
      },
    });

    this.logger.log(`Updated tokens for channel ${id}`);
    return updated;
  }

  /**
   * 채널의 복호화된 토큰 가져오기 (내부 사용 전용)
   *
   * 웹훅 처리 등 실제 API 호출 시에만 사용
   */
  async getDecryptedTokens(id: string): Promise<{
    access_token: string | null;
    refresh_token: string | null;
  }> {
    const channel = await this.prisma.read.channel.findFirst({
      where: { id },
      select: {
        access_token: true,
        refresh_token: true,
      },
    });

    if (!channel) {
      throw new NotFoundException(`Channel ${id} not found`);
    }

    return {
      access_token: channel.access_token
        ? this.encryptionService.decrypt(channel.access_token)
        : null,
      refresh_token: channel.refresh_token
        ? this.encryptionService.decrypt(channel.refresh_token)
        : null,
    };
  }
}
