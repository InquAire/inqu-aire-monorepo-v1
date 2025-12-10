import { Prisma } from '@/prisma';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Queue } from 'bullmq';

import { AiService } from '../ai/ai.service';
import { CustomersService } from '../customers/customers.service';

import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { QueryInquiryDto } from './dto/query-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';

import { createPaginatedResponse } from '@/common/dto/pagination.dto';
import { CACHE_TTL, CacheService } from '@/common/modules/cache/cache.service';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

@Injectable()
export class InquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    _customersService: CustomersService,
    private readonly logger: CustomLoggerService,
    private readonly cacheService: CacheService,
    @InjectQueue('ai-analysis') private readonly aiAnalysisQueue: Queue
  ) {
    // _customersService is available in constructor but not stored
  }

  /**
   * 문의 생성 (프로덕션 레벨)
   */
  async create(dto: CreateInquiryDto) {
    const startTime = Date.now();

    try {
      this.logger.log('Creating inquiry', 'InquiriesService', {
        customerId: dto.customer_id,
        channelId: dto.channel_id,
        messageLength: dto.message_text.length,
        businessId: dto.business_id,
        timestamp: new Date().toISOString(),
      });

      // 유효성 검증 (Read DB)
      const [channel, customer] = await Promise.all([
        this.prisma.read.channel.findFirst({
          where: { id: dto.channel_id },
        }),
        this.prisma.read.customer.findFirst({
          where: { id: dto.customer_id },
        }),
      ]);

      if (!channel || channel.deleted_at) {
        throw new NotFoundException('Channel not found');
      }

      if (!customer || customer.deleted_at) {
        throw new NotFoundException('Customer not found');
      }

      if (channel.business_id !== customer.business_id) {
        throw new BadRequestException('Channel and customer must belong to the same business');
      }

      // Write DB - 트랜잭션으로 문의 생성 및 고객 업데이트
      const inquiry = await this.prisma.write.$transaction(async tx => {
        // 1. 문의 생성
        const newInquiry = await tx.inquiry.create({
          data: {
            business_id: dto.business_id,
            channel_id: dto.channel_id,
            customer_id: dto.customer_id,
            message_text: dto.message_text,
            platform_message_id: dto.platform_message_id || '',
            extracted_info: dto.extracted_info ?? undefined,
            status: 'NEW',
            received_at: new Date(),
          },
          include: {
            customer: true,
            channel: true,
            business: true,
          },
        });

        // 2. 고객의 last_contact 업데이트
        await tx.customer.update({
          where: { id: dto.customer_id },
          data: {
            last_contact: new Date(),
            inquiry_count: {
              increment: 1,
            },
          },
        });

        return newInquiry;
      });

      this.logger.log('Inquiry created successfully', 'InquiriesService', {
        inquiryId: inquiry.id,
        customerId: inquiry.customer_id,
        channelId: inquiry.channel_id,
        businessId: dto.business_id,
        status: inquiry.status,
      });

      // AI 분석 Job 추가 (비동기 처리)
      await this.aiAnalysisQueue.add(
        'analyze-inquiry',
        {
          inquiryId: inquiry.id,
          businessId: dto.business_id,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000, // 2초, 4초, 8초
          },
        }
      );

      this.logger.log('AI analysis job queued', 'InquiriesService', {
        inquiryId: inquiry.id,
        businessId: dto.business_id,
        attempts: 3,
      });

      // 캐시 무효화 (새 문의 생성으로 통계가 변경됨)
      await this.invalidateStatsCache(dto.business_id);

      const processingTime = Date.now() - startTime;

      // ✅ Sentry: 성공 컨텍스트 기록
      Sentry.setContext('inquiry_creation', {
        business_id: dto.business_id,
        channel_id: dto.channel_id,
        processing_time_ms: processingTime,
        status: 'success',
      });

      return inquiry;
    } catch (error) {
      // ❌ Sentry: 에러 캡처 (컨텍스트 포함)
      Sentry.setContext('inquiry_creation', {
        business_id: dto.business_id,
        channel_id: dto.channel_id,
        processing_time_ms: Date.now() - startTime,
        status: 'error',
        error_type: error instanceof Error ? error.name : 'UnknownError',
      });

      Sentry.captureException(error, {
        tags: {
          module: 'inquiries',
          operation: 'create',
          business_id: dto.business_id,
          channel_id: dto.channel_id,
        },
        level: 'error',
      });

      throw error;
    }
  }

  /**
   * 문의 목록 조회 (페이지네이션, 필터링)
   */
  async findAll(query: QueryInquiryDto) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'received_at',
      sortOrder = 'desc',
      search,
      start_date,
      end_date,
      ...filters
    } = query;

    const skip = (page - 1) * limit;

    // 필터 조건 구성
    const where: Prisma.InquiryWhereInput = {
      deleted_at: null,
    };

    if (filters.business_id) {
      where.business_id = filters.business_id;
    }

    if (filters.channel_id) {
      where.channel_id = filters.channel_id;
    }

    if (filters.customer_id) {
      where.customer_id = filters.customer_id;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    // 날짜 범위 필터
    if (start_date || end_date) {
      where.received_at = {};
      if (start_date) {
        where.received_at.gte = new Date(start_date);
      }
      if (end_date) {
        // end_date를 23:59:59로 설정하여 해당 날짜 전체를 포함
        const endDateTime = new Date(end_date);
        endDateTime.setHours(23, 59, 59, 999);
        where.received_at.lte = endDateTime;
      }
    }

    if (search) {
      where.OR = [
        { message_text: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { reply_text: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Read DB - 전체 개수 조회
    const total = await this.prisma.read.inquiry.count({ where });

    // Read DB - 문의 목록 조회
    const inquiries = await this.prisma.read.inquiry.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            platform: true,
            platform_user_id: true,
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
            platform: true,
          },
        },
      },
    });

    return createPaginatedResponse(inquiries, total, page, limit);
  }

  /**
   * 문의 상세 조회
   */
  async findOne(id: string) {
    // Read DB
    const inquiry = await this.prisma.read.inquiry.findFirst({
      where: { id },
      include: {
        customer: true,
        channel: true,
        business: true,
        replies: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!inquiry || inquiry.deleted_at) {
      throw new NotFoundException(`Inquiry ${id} not found`);
    }

    return inquiry;
  }

  /**
   * 플랫폼 메시지 ID로 문의 찾기
   */
  async findByPlatformMessageId(platformMessageId: string) {
    return this.prisma.read.inquiry.findFirst({
      where: {
        platform_message_id: platformMessageId,
        deleted_at: null,
      },
    });
  }

  /**
   * 문의 업데이트
   */
  async update(id: string, dto: UpdateInquiryDto) {
    this.logger.log('Updating inquiry', 'InquiriesService', {
      inquiryId: id,
      updateFields: Object.keys(dto),
      hasStatusChange: dto.status !== undefined,
      newStatus: dto.status,
    });

    // 존재 확인
    await this.findOne(id);

    // Write DB
    const updated = await this.prisma.write.inquiry.update({
      where: { id },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.reply_text !== undefined && { reply_text: dto.reply_text }),
        updated_at: new Date(),
        ...(dto.status === 'COMPLETED' && { completed_at: new Date() }),
      },
      include: {
        customer: true,
        channel: true,
      },
    });

    this.logger.log('Inquiry updated successfully', 'InquiriesService', {
      inquiryId: id,
      status: updated.status,
      businessId: updated.business_id,
      customerId: updated.customer_id,
    });
    return updated;
  }

  /**
   * 문의 삭제 (소프트 삭제)
   */
  async remove(id: string) {
    this.logger.log('Deleting inquiry', 'InquiriesService', {
      inquiryId: id,
    });

    // 존재 확인
    const inquiry = await this.findOne(id);

    // 진행 중인 문의는 삭제 불가
    if (inquiry.status === 'IN_PROGRESS') {
      throw new BadRequestException(
        'Cannot delete inquiry in progress. Please complete or cancel it first.'
      );
    }

    // Write DB
    const deleted = await this.prisma.write.inquiry.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });

    this.logger.log('Inquiry deleted successfully', 'InquiriesService', {
      inquiryId: id,
      businessId: inquiry.business_id,
      previousStatus: inquiry.status,
    });
    return { message: 'Inquiry deleted successfully', id: deleted.id };
  }

  /**
   * AI 분석 실행
   */
  async analyzeWithAi(id: string) {
    this.logger.log('Starting AI analysis', 'InquiriesService', {
      inquiryId: id,
    });

    const inquiry = await this.findOne(id);

    if (inquiry.analyzed_at) {
      this.logger.warn('Inquiry already analyzed', 'InquiriesService', {
        inquiryId: id,
        analyzedAt: inquiry.analyzed_at,
      });
    }

    // 사업체의 산업 유형 가져오기 (Read DB)
    const business = await this.prisma.read.business.findFirst({
      where: { id: inquiry.business_id },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const startTime = Date.now();

    // AI 분석
    const analysis = await this.aiService.analyzeInquiry({
      message: inquiry.message_text,
      industryType: business.industry_type,
    });

    const processingTime = Date.now() - startTime;

    // 분석 결과 저장 (Write DB)
    const updated = await this.prisma.write.inquiry.update({
      where: { id },
      data: {
        type: analysis.type,
        summary: analysis.summary,
        extracted_info: analysis.extracted_info as Prisma.InputJsonValue,
        sentiment: analysis.sentiment,
        urgency: analysis.urgency,
        reply_text: analysis.suggested_reply,
        ai_confidence: analysis.confidence,
        ai_model: 'gpt-4o-mini',
        ai_processing_time: processingTime,
        analyzed_at: new Date(),
        status: 'IN_PROGRESS',
      },
    });

    this.logger.log('AI analysis completed', 'InquiriesService', {
      inquiryId: id,
      processingTime: `${processingTime}ms`,
      sentiment: analysis.sentiment,
      urgency: analysis.urgency,
      type: analysis.type,
      confidence: analysis.confidence,
    });
    return updated;
  }

  /**
   * 문의 답변 전송
   */
  async sendReply(id: string, replyText: string, senderId?: string) {
    this.logger.log('Sending reply', 'InquiriesService', {
      inquiryId: id,
      replyLength: replyText.length,
      senderId: senderId || 'system',
    });

    // 존재 확인
    await this.findOne(id);

    // Write DB - 트랜잭션으로 답변 생성 및 문의 업데이트
    return this.prisma.write.$transaction(async tx => {
      // 1. 답변 생성
      await tx.inquiryReply.create({
        data: {
          inquiry_id: id,
          message_text: replyText,
          sender_type: senderId ? 'HUMAN' : 'AI',
          sender_id: senderId,
          is_sent: false,
        },
      });

      // 2. 문의 상태 업데이트
      const updated = await tx.inquiry.update({
        where: { id },
        data: {
          reply_text: replyText,
          replied_at: new Date(),
          status: 'IN_PROGRESS',
        },
      });

      return updated;
    });
  }

  /**
   * 통계 조회 (Cache Stampede 방지 적용)
   */
  async getStats(businessId: string, startDate?: Date, endDate?: Date) {
    // 캐시 키 생성 (날짜 범위 포함)
    const dateKey = `${startDate?.toISOString() || 'all'}_${endDate?.toISOString() || 'all'}`;
    const cacheKey = this.cacheService.generateKey('stats', 'inquiries', businessId, dateKey);

    // ✅ getOrSet 사용: Lock 기반 캐시 갱신으로 동시 요청 시 DB 부하 방지
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // Factory 함수: 캐시 미스 시에만 실행 (Lock 획득한 요청만)
        const where: Prisma.InquiryWhereInput = {
          business_id: businessId,
          deleted_at: null,
        };

        if (startDate || endDate) {
          where.received_at = {};
          if (startDate) where.received_at.gte = startDate;
          if (endDate) where.received_at.lte = endDate;
        }

        // Read DB - Statistics
        const [total, byStatus, bySentiment, byUrgency, byType] = await Promise.all([
          // 전체 개수
          this.prisma.read.inquiry.count({ where }),

          // 상태별
          this.prisma.read.inquiry.groupBy({
            by: ['status'],
            where,
            _count: true,
          }),

          // 감정별
          this.prisma.read.inquiry.groupBy({
            by: ['sentiment'],
            where: { ...where, sentiment: { not: null } },
            _count: true,
          }),

          // 긴급도별
          this.prisma.read.inquiry.groupBy({
            by: ['urgency'],
            where: { ...where, urgency: { not: null } },
            _count: true,
          }),

          // 유형별
          this.prisma.read.inquiry.groupBy({
            by: ['type'],
            where: { ...where, type: { not: null } },
            _count: true,
            orderBy: {
              _count: {
                type: 'desc',
              },
            },
            take: 10,
          }),
        ]);

        this.logger.log(`Generated inquiry stats for business ${businessId}`, 'InquiriesService');

        return {
          business_id: businessId,
          period: {
            start: startDate,
            end: endDate,
          },
          total,
          byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
          bySentiment: bySentiment.map(s => ({ sentiment: s.sentiment, count: s._count })),
          byUrgency: byUrgency.map(u => ({ urgency: u.urgency, count: u._count })),
          byType: byType.map(t => ({ type: t.type, count: t._count })),
        };
      },
      CACHE_TTL.INQUIRY_STATS // 5분 TTL
    );
  }

  /**
   * 문의 상태 변경
   */
  async updateStatus(id: string, status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD') {
    this.logger.log('Updating inquiry status', 'InquiriesService', {
      inquiryId: id,
      newStatus: status,
    });

    // 존재 확인
    await this.findOne(id);

    // Write DB
    const updated = await this.prisma.write.inquiry.update({
      where: { id },
      data: {
        status,
        ...(status === 'COMPLETED' && { completed_at: new Date() }),
        updated_at: new Date(),
      },
    });

    this.logger.log('Inquiry status updated', 'InquiriesService', {
      inquiryId: id,
      status: status,
      completedAt: updated.completed_at,
    });

    // 캐시 무효화 (상태 변경으로 통계가 변경됨)
    const inquiry = await this.findOne(id);
    await this.invalidateStatsCache(inquiry.business_id);

    return updated;
  }

  /**
   * 캐시 무효화 헬퍼
   */
  private async invalidateStatsCache(businessId: string): Promise<void> {
    try {
      // 비즈니스 대시보드 캐시 삭제
      const dashboardKey = this.cacheService.generateKey('dashboard', 'business', businessId);
      await this.cacheService.del(dashboardKey);

      // 문의 통계 캐시 패턴 삭제 (모든 날짜 범위)
      const statsPattern = this.cacheService.generateKey('stats', 'inquiries', businessId, '*');
      await this.cacheService.delPattern(statsPattern);

      this.logger.debug(`Invalidated stats cache for business ${businessId}`, 'InquiriesService');
    } catch (error) {
      // 캐시 무효화 실패는 로그만 남기고 에러를 던지지 않음
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to invalidate stats cache', errorMessage, 'InquiriesService');
    }
  }
}
