import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

import { CreateInquiryReplyDto } from './dto/create-inquiry-reply.dto';
import { UpdateInquiryReplyDto } from './dto/update-inquiry-reply.dto';
import { QueryInquiryReplyDto } from './dto/query-inquiry-reply.dto';

@Injectable()
export class InquiryRepliesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 답변 생성
   */
  async create(createDto: CreateInquiryReplyDto) {
    return await this.prisma.write.inquiryReply.create({
      data: {
        ...createDto,
        sent_at: createDto.is_sent ? new Date() : null,
      },
      include: {
        inquiry: {
          include: {
            customer: true,
          },
        },
      },
    });
  }

  /**
   * 답변 목록 조회
   */
  async findAll(query: QueryInquiryReplyDto) {
    const { inquiry_id, sender_type, is_sent, limit = '20', offset = '0' } = query;

    const where: any = {};

    if (inquiry_id) {
      where.inquiry_id = inquiry_id;
    }

    if (sender_type) {
      where.sender_type = sender_type;
    }

    if (is_sent !== undefined) {
      where.is_sent = is_sent;
    }

    const [data, total] = await Promise.all([
      this.prisma.read.inquiryReply.findMany({
        where,
        include: {
          inquiry: {
            include: {
              customer: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: parseInt(limit, 10),
        skip: parseInt(offset, 10),
      }),
      this.prisma.read.inquiryReply.count({ where }),
    ]);

    return {
      data,
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    };
  }

  /**
   * 특정 문의에 대한 답변 이력 조회
   */
  async findByInquiryId(inquiryId: string) {
    const replies = await this.prisma.read.inquiryReply.findMany({
      where: { inquiry_id: inquiryId },
      orderBy: { created_at: 'asc' }, // 시간순 정렬
    });

    return {
      data: replies,
      total: replies.length,
    };
  }

  /**
   * 답변 상세 조회
   */
  async findOne(id: string) {
    const reply = await this.prisma.read.inquiryReply.findUnique({
      where: { id },
      include: {
        inquiry: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!reply) {
      throw new NotFoundException(`답변을 찾을 수 없습니다 (ID: ${id})`);
    }

    return reply;
  }

  /**
   * 답변 업데이트
   */
  async update(id: string, updateDto: UpdateInquiryReplyDto) {
    await this.findOne(id); // 존재 여부 확인

    const data: any = { ...updateDto };

    // is_sent가 true로 변경되면 sent_at 설정
    if (updateDto.is_sent === true) {
      data.sent_at = new Date();
    }

    return await this.prisma.write.inquiryReply.update({
      where: { id },
      data,
      include: {
        inquiry: {
          include: {
            customer: true,
          },
        },
      },
    });
  }

  /**
   * 답변 삭제
   */
  async remove(id: string) {
    await this.findOne(id); // 존재 여부 확인

    await this.prisma.write.inquiryReply.delete({
      where: { id },
    });

    return { message: '답변이 삭제되었습니다' };
  }

  /**
   * 답변 재시도
   */
  async retry(id: string) {
    const reply = await this.findOne(id);

    return await this.prisma.write.inquiryReply.update({
      where: { id },
      data: {
        retry_count: reply.retry_count + 1,
        failed_reason: null,
      },
    });
  }

  /**
   * 답변 전송 완료 처리
   */
  async markAsSent(id: string) {
    await this.findOne(id);

    return await this.prisma.write.inquiryReply.update({
      where: { id },
      data: {
        is_sent: true,
        sent_at: new Date(),
      },
    });
  }

  /**
   * 답변 전송 실패 처리
   */
  async markAsFailed(id: string, reason: string) {
    await this.findOne(id);

    return await this.prisma.write.inquiryReply.update({
      where: { id },
      data: {
        is_sent: false,
        failed_reason: reason,
      },
    });
  }
}
