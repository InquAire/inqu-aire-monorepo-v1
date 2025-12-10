import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

import { CreateIndustryConfigDto } from './dto/create-industry-config.dto';
import { UpdateIndustryConfigDto } from './dto/update-industry-config.dto';
import { QueryIndustryConfigDto } from './dto/query-industry-config.dto';

@Injectable()
export class IndustryConfigsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 업종 설정 생성
   */
  async create(createDto: CreateIndustryConfigDto) {
    return await this.prisma.write.industryConfig.create({
      data: createDto,
    });
  }

  /**
   * 업종 설정 목록 조회
   */
  async findAll(query: QueryIndustryConfigDto) {
    const { industry } = query;

    const where: any = {};

    if (industry) {
      where.industry = industry;
    }

    const data = await this.prisma.read.industryConfig.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return {
      data,
      total: data.length,
    };
  }

  /**
   * 업종 설정 상세 조회
   */
  async findOne(id: string) {
    const config = await this.prisma.read.industryConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException(`업종 설정을 찾을 수 없습니다 (ID: ${id})`);
    }

    return config;
  }

  /**
   * 업종별 설정 조회 (industry로 조회)
   */
  async findByIndustry(industry: string) {
    const config = await this.prisma.read.industryConfig.findUnique({
      where: { industry: industry as any },
    });

    if (!config) {
      throw new NotFoundException(`업종 설정을 찾을 수 없습니다 (Industry: ${industry})`);
    }

    return config;
  }

  /**
   * 업종 설정 업데이트
   */
  async update(id: string, updateDto: UpdateIndustryConfigDto) {
    await this.findOne(id); // 존재 여부 확인

    return await this.prisma.write.industryConfig.update({
      where: { id },
      data: updateDto,
    });
  }

  /**
   * 업종 설정 삭제
   */
  async remove(id: string) {
    await this.findOne(id); // 존재 여부 확인

    await this.prisma.write.industryConfig.delete({
      where: { id },
    });

    return { message: '업종 설정이 삭제되었습니다' };
  }
}
