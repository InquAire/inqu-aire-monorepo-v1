import { Prisma } from '@/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';

import { QueryErrorLogDto } from './dto/query-error-log.dto';
import { ResolveErrorLogDto } from './dto/resolve-error-log.dto';

import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

@Injectable()
export class ErrorLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService
  ) {}

  /**
   * 에러 로그 목록 조회
   */
  async findAll(query: QueryErrorLogDto) {
    const { error_type, resolved, user_id, page = 1, limit = 20 } = query;

    const where: Prisma.ErrorLogWhereInput = {};

    // 에러 유형 필터
    if (error_type) {
      where.error_type = error_type;
    }

    // 해결 여부 필터
    if (typeof resolved === 'boolean') {
      where.resolved = resolved;
    }

    // 사용자 필터
    if (user_id) {
      where.user_id = user_id;
    }

    // 총 개수 조회 (Read DB)
    const total = await this.prisma.read.errorLog.count({ where });

    // 목록 조회 (Read DB)
    const errorLogs = await this.prisma.read.errorLog.findMany({
      where,
      orderBy: {
        occurred_at: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return {
      data: errorLogs,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 에러 로그 상세 조회
   */
  async findOne(id: string) {
    const errorLog = await this.prisma.read.errorLog.findFirst({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!errorLog) {
      throw new NotFoundException('Error log not found');
    }

    return errorLog;
  }

  /**
   * 에러 로그 해결 처리
   */
  async resolve(id: string, dto: ResolveErrorLogDto) {
    this.logger.log(`Resolving error log: ${id}`);

    // 에러 로그 존재 확인 (Read DB)
    await this.findOne(id);

    // 해결 처리 (Write DB)
    const updated = await this.prisma.write.errorLog.update({
      where: { id },
      data: {
        resolved: dto.resolved,
        resolved_at: dto.resolved ? new Date() : null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Error log ${id} resolved: ${dto.resolved}`);
    return updated;
  }

  /**
   * 에러 로그 통계
   */
  async getStats() {
    const [total, unresolved, byType] = await Promise.all([
      // 전체 에러 수
      this.prisma.read.errorLog.count(),

      // 미해결 에러 수
      this.prisma.read.errorLog.count({
        where: { resolved: false },
      }),

      // 유형별 에러 수
      this.prisma.read.errorLog.groupBy({
        by: ['error_type'],
        _count: true,
        orderBy: {
          _count: {
            error_type: 'desc',
          },
        },
      }),
    ]);

    return {
      total,
      unresolved,
      resolved: total - unresolved,
      by_type: byType.map(item => ({
        error_type: item.error_type,
        count: item._count,
      })),
    };
  }
}
