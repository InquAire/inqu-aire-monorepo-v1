import { Prisma } from '@/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';

import { QueryWebhookEventDto } from './dto/query-webhook-event.dto';

import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

@Injectable()
export class WebhookEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService
  ) {}

  /**
   * 웹훅 이벤트 목록 조회
   */
  async findAll(query: QueryWebhookEventDto) {
    const { channel_id, event_type, processed, page = 1, limit = 20 } = query;

    const where: Prisma.WebhookEventWhereInput = {};

    // 채널 필터
    if (channel_id) {
      where.channel_id = channel_id;
    }

    // 이벤트 유형 필터
    if (event_type) {
      where.event_type = event_type;
    }

    // 처리 여부 필터
    if (typeof processed === 'boolean') {
      where.processed = processed;
    }

    // 총 개수 조회 (Read DB)
    const total = await this.prisma.read.webhookEvent.count({ where });

    // 목록 조회 (Read DB)
    const events = await this.prisma.read.webhookEvent.findMany({
      where,
      orderBy: {
        received_at: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: events,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 웹훅 이벤트 상세 조회
   */
  async findOne(id: string) {
    const event = await this.prisma.read.webhookEvent.findFirst({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException('Webhook event not found');
    }

    return event;
  }

  /**
   * 웹훅 이벤트 재시도
   */
  async retry(id: string) {
    this.logger.log(`Retrying webhook event: ${id}`);

    // 이벤트 존재 확인 (Read DB)
    const event = await this.findOne(id);

    // 재시도 카운트 증가 (Write DB)
    const updated = await this.prisma.write.webhookEvent.update({
      where: { id },
      data: {
        retry_count: event.retry_count + 1,
        processed: false,
        processed_at: null,
        error_message: null,
      },
    });

    this.logger.log(`Webhook event ${id} queued for retry (attempt ${updated.retry_count})`);

    // TODO: 실제로 웹훅 처리 큐에 추가하는 로직 필요
    // await this.webhookQueue.add('process-webhook', { eventId: id });

    return {
      message: 'Webhook event queued for retry',
      event: updated,
    };
  }

  /**
   * 웹훅 이벤트 통계
   */
  async getStats() {
    const [total, unprocessed, byEventType, failedEvents] = await Promise.all([
      // 전체 이벤트 수
      this.prisma.read.webhookEvent.count(),

      // 미처리 이벤트 수
      this.prisma.read.webhookEvent.count({
        where: { processed: false },
      }),

      // 이벤트 유형별 통계
      this.prisma.read.webhookEvent.groupBy({
        by: ['event_type'],
        _count: true,
        orderBy: {
          _count: {
            event_type: 'desc',
          },
        },
      }),

      // 에러가 있는 이벤트
      this.prisma.read.webhookEvent.count({
        where: {
          error_message: {
            not: null,
          },
        },
      }),
    ]);

    return {
      total,
      unprocessed,
      processed: total - unprocessed,
      failed: failedEvents,
      by_event_type: byEventType.map(item => ({
        event_type: item.event_type,
        count: item._count,
      })),
    };
  }
}
