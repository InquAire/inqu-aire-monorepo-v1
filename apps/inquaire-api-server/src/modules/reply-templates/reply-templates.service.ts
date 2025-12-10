import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@/prisma';

import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

import {
  CreateReplyTemplateDto,
  UpdateReplyTemplateDto,
  QueryReplyTemplateDto,
} from './dto';

@Injectable()
export class ReplyTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 답변 템플릿 생성
   */
  async create(dto: CreateReplyTemplateDto) {
    return this.prisma.write.replyTemplate.create({
      data: {
        business_id: dto.business_id,
        name: dto.name,
        type: dto.type,
        content: dto.content,
        variables: dto.variables ?? [],
        is_active: dto.is_active ?? true,
      },
    });
  }

  /**
   * 답변 템플릿 목록 조회
   */
  async findAll(query: QueryReplyTemplateDto) {
    const {
      business_id,
      type,
      search,
      is_active,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.ReplyTemplateWhereInput = {
      deleted_at: null,
    };

    if (business_id) {
      where.business_id = business_id;
    }

    if (type) {
      where.type = type;
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.read.replyTemplate.findMany({
        where,
        orderBy: {
          created_at: 'desc',
        },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.read.replyTemplate.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 답변 템플릿 상세 조회
   */
  async findOne(id: string) {
    const template = await this.prisma.read.replyTemplate.findUnique({
      where: { id },
    });

    if (!template || template.deleted_at) {
      throw new NotFoundException('템플릿을 찾을 수 없습니다');
    }

    return template;
  }

  /**
   * 답변 템플릿 수정
   */
  async update(id: string, dto: UpdateReplyTemplateDto) {
    const template = await this.findOne(id);

    return this.prisma.write.replyTemplate.update({
      where: { id: template.id },
      data: {
        name: dto.name,
        type: dto.type,
        content: dto.content,
        variables: dto.variables,
        is_active: dto.is_active,
        updated_at: new Date(),
      },
    });
  }

  /**
   * 답변 템플릿 삭제 (소프트 삭제)
   */
  async remove(id: string) {
    const template = await this.findOne(id);

    return this.prisma.write.replyTemplate.update({
      where: { id: template.id },
      data: {
        deleted_at: new Date(),
      },
    });
  }

  /**
   * 템플릿 사용 횟수 증가
   */
  async incrementUsageCount(id: string) {
    const template = await this.findOne(id);

    return this.prisma.write.replyTemplate.update({
      where: { id: template.id },
      data: {
        usage_count: {
          increment: 1,
        },
      },
    });
  }
}
