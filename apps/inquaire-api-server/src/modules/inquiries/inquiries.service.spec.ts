/**
 * InquiriesService Unit Tests
 *
 * 테스트 범위:
 * - 문의 생성 (create)
 * - 문의 조회 (findOne, findAll)
 * - 문의 업데이트 (update)
 * - 문의 삭제 (soft delete)
 * - 상태 전환 (pending → answered)
 * - AI 답변 생성 트리거
 * - 페이지네이션 (limit, offset)
 * - 검색 (by keyword, date range)
 * - 필터링 (by status, platform)
 * - 통계 조회 (getStats)
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Job, Queue } from 'bullmq';

import { AiService } from '../ai/ai.service';
import { CustomersService } from '../customers/customers.service';

import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { QueryInquiryDto } from './dto/query-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';
import { InquiriesService } from './inquiries.service';

import { CACHE_TTL, CacheService } from '@/common/modules/cache/cache.service';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

describe('InquiriesService', () => {
  let service: InquiriesService;
  let prisma: {
    read: {
      channel: { findUnique: jest.Mock; findFirst: jest.Mock };
      customer: { findUnique: jest.Mock; findFirst: jest.Mock };
      business: { findUnique: jest.Mock; findFirst: jest.Mock };
      inquiry: {
        findUnique: jest.Mock;
        findMany: jest.Mock;
        findFirst: jest.Mock;
        count: jest.Mock;
        groupBy: jest.Mock;
      };
    };
    write: {
      inquiry: {
        create: jest.Mock;
        update: jest.Mock;
        $transaction: jest.Mock;
      };
      inquiryReply: { create: jest.Mock };
      customer: { update: jest.Mock };
      $transaction: jest.Mock;
    };
  };
  let aiService: jest.Mocked<AiService>;
  let logger: jest.Mocked<CustomLoggerService>;
  let cacheService: jest.Mocked<CacheService>;
  let aiAnalysisQueue: jest.Mocked<Queue>;

  // Test data
  const mockChannel = {
    id: 'channel-123',
    business_id: 'business-123',
    name: 'Test Channel',
    platform: 'KAKAO',
    deleted_at: null,
  };

  const mockCustomer = {
    id: 'customer-123',
    business_id: 'business-123',
    platform_user_id: 'user-123',
    platform: 'KAKAO',
    name: 'Test Customer',
    deleted_at: null,
  };

  const mockBusiness = {
    id: 'business-123',
    name: 'Test Business',
    industry_type: 'HOSPITAL',
  };

  const mockInquiry = {
    id: 'inquiry-123',
    business_id: 'business-123',
    channel_id: 'channel-123',
    customer_id: 'customer-123',
    message_text: 'Test message',
    status: 'NEW',
    received_at: new Date(),
    deleted_at: null,
    customer: mockCustomer,
    channel: mockChannel,
    business: mockBusiness,
  };

  beforeEach(async () => {
    // Create mock implementations
    const mockPrismaService = {
      read: {
        channel: {
          findUnique: jest.fn(),
          findFirst: jest.fn(),
        },
        customer: {
          findUnique: jest.fn(),
          findFirst: jest.fn(),
        },
        inquiry: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
          findFirst: jest.fn(),
          count: jest.fn(),
          groupBy: jest.fn(),
        },
        business: {
          findUnique: jest.fn(),
          findFirst: jest.fn(),
        },
      },
      write: {
        inquiry: {
          create: jest.fn(),
          update: jest.fn(),
        },
        inquiryReply: {
          create: jest.fn(),
        },
        customer: {
          update: jest.fn(),
        },
        $transaction: jest.fn(),
      },
    };

    const mockAiService = {
      analyzeInquiry: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
      generateKey: jest.fn((...args) => args.join(':')),
    };

    const mockAiAnalysisQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InquiriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AiService,
          useValue: mockAiService,
        },
        {
          provide: CustomersService,
          useValue: {},
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: 'BullQueue_ai-analysis',
          useValue: mockAiAnalysisQueue,
        },
      ],
    }).compile();

    service = module.get<InquiriesService>(InquiriesService);
    prisma = module.get(PrismaService) as typeof prisma;
    aiService = module.get(AiService) as jest.Mocked<AiService>;
    logger = module.get(CustomLoggerService) as jest.Mocked<CustomLoggerService>;
    cacheService = module.get(CacheService) as jest.Mocked<CacheService>;
    aiAnalysisQueue = module.get('BullQueue_ai-analysis') as jest.Mocked<Queue>;

    // Compatibility layer: make findFirst point to findUnique for existing tests
    prisma.read.channel.findFirst = prisma.read.channel.findUnique;
    prisma.read.customer.findFirst = prisma.read.customer.findUnique;
    prisma.read.business.findFirst = prisma.read.business.findUnique;
    prisma.read.inquiry.findFirst = prisma.read.inquiry.findUnique;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateInquiryDto = {
      business_id: 'business-123',
      channel_id: 'channel-123',
      customer_id: 'customer-123',
      message_text: 'Test inquiry message',
    };

    it('should create inquiry successfully', async () => {
      // Arrange
      prisma.read.channel.findUnique.mockResolvedValue(mockChannel);
      prisma.read.customer.findUnique.mockResolvedValue(mockCustomer);
      prisma.write.$transaction.mockImplementation(async callback => {
        return callback({
          inquiry: {
            create: jest.fn().mockResolvedValue(mockInquiry),
          },
          customer: {
            update: jest.fn().mockResolvedValue(mockCustomer),
          },
        });
      });
      const mockJob = { id: 'job-123' } as Job;
      aiAnalysisQueue.add.mockResolvedValue(mockJob);
      cacheService.del.mockResolvedValue(undefined);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toBeDefined();
      expect(prisma.read.channel.findUnique).toHaveBeenCalledWith({
        where: { id: createDto.channel_id },
      });
      expect(prisma.read.customer.findUnique).toHaveBeenCalledWith({
        where: { id: createDto.customer_id },
      });
      expect(aiAnalysisQueue.add).toHaveBeenCalledWith(
        'analyze-inquiry',
        {
          inquiryId: mockInquiry.id,
          businessId: createDto.business_id,
        },
        expect.any(Object)
      );
    });

    it('should throw NotFoundException when channel not found', async () => {
      // Arrange
      prisma.read.channel.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when customer not found', async () => {
      // Arrange
      prisma.read.channel.findUnique.mockResolvedValue(mockChannel);
      prisma.read.customer.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when channel and customer belong to different businesses', async () => {
      // Arrange
      prisma.read.channel.findUnique.mockResolvedValue(mockChannel);
      prisma.read.customer.findUnique.mockResolvedValue({
        ...mockCustomer,
        business_id: 'different-business',
      });

      // Act & Assert
      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should invalidate stats cache after creation', async () => {
      // Arrange
      prisma.read.channel.findUnique.mockResolvedValue(mockChannel);
      prisma.read.customer.findUnique.mockResolvedValue(mockCustomer);
      prisma.write.$transaction.mockImplementation(async callback => {
        return callback({
          inquiry: {
            create: jest.fn().mockResolvedValue(mockInquiry),
          },
          customer: {
            update: jest.fn().mockResolvedValue(mockCustomer),
          },
        });
      });
      const mockJob = { id: 'job-123' } as Job;
      aiAnalysisQueue.add.mockResolvedValue(mockJob);

      // Act
      await service.create(createDto);

      // Assert
      expect(cacheService.delPattern).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const queryDto: QueryInquiryDto = {
      page: 1,
      limit: 20,
      sortBy: 'received_at',
      sortOrder: 'desc',
    };

    it('should return paginated inquiries', async () => {
      // Arrange
      prisma.read.inquiry.count.mockResolvedValue(50);
      prisma.read.inquiry.findMany.mockResolvedValue([mockInquiry]);

      // Act
      const result = await service.findAll(queryDto);

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(50);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.totalPages).toBe(3);
      expect(prisma.read.inquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: {
            received_at: 'desc',
          },
        })
      );
    });

    it('should filter by business_id', async () => {
      // Arrange
      const filteredQuery: QueryInquiryDto = {
        ...queryDto,
        business_id: 'business-123',
      };
      prisma.read.inquiry.count.mockResolvedValue(10);
      prisma.read.inquiry.findMany.mockResolvedValue([mockInquiry]);

      // Act
      await service.findAll(filteredQuery);

      // Assert
      expect(prisma.read.inquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            business_id: 'business-123',
            deleted_at: null,
          }),
        })
      );
    });

    it('should filter by status', async () => {
      // Arrange
      const filteredQuery: QueryInquiryDto = {
        ...queryDto,
        status: 'IN_PROGRESS',
      };
      prisma.read.inquiry.count.mockResolvedValue(5);
      prisma.read.inquiry.findMany.mockResolvedValue([]);

      // Act
      await service.findAll(filteredQuery);

      // Assert
      expect(prisma.read.inquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'IN_PROGRESS',
          }),
        })
      );
    });

    it('should search by keyword', async () => {
      // Arrange
      const searchQuery: QueryInquiryDto = {
        ...queryDto,
        search: 'test',
      };
      prisma.read.inquiry.count.mockResolvedValue(3);
      prisma.read.inquiry.findMany.mockResolvedValue([]);

      // Act
      await service.findAll(searchQuery);

      // Assert
      expect(prisma.read.inquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { message_text: { contains: 'test', mode: 'insensitive' } },
              { summary: { contains: 'test', mode: 'insensitive' } },
              { reply_text: { contains: 'test', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const pageQuery: QueryInquiryDto = {
        ...queryDto,
        page: 2,
        limit: 10,
      };
      prisma.read.inquiry.count.mockResolvedValue(50);
      prisma.read.inquiry.findMany.mockResolvedValue([]);

      // Act
      const result = await service.findAll(pageQuery);

      // Assert
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(prisma.read.inquiry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });
  });

  describe('findOne', () => {
    const inquiryId = 'inquiry-123';

    it('should return inquiry with relations', async () => {
      // Arrange
      prisma.read.inquiry.findUnique.mockResolvedValue(mockInquiry);

      // Act
      const result = await service.findOne(inquiryId);

      // Assert
      expect(result).toEqual(mockInquiry);
      expect(prisma.read.inquiry.findUnique).toHaveBeenCalledWith({
        where: { id: inquiryId },
        include: {
          customer: true,
          channel: true,
          business: true,
          replies: {
            orderBy: { created_at: 'asc' },
          },
        },
      });
    });

    it('should throw NotFoundException when inquiry not found', async () => {
      // Arrange
      prisma.read.inquiry.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(inquiryId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when inquiry is deleted', async () => {
      // Arrange
      prisma.read.inquiry.findUnique.mockResolvedValue({
        ...mockInquiry,
        deleted_at: new Date(),
      });

      // Act & Assert
      await expect(service.findOne(inquiryId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const inquiryId = 'inquiry-123';
    const updateDto: UpdateInquiryDto = {
      status: 'IN_PROGRESS',
      notes: 'Updated notes',
    };

    it('should update inquiry successfully', async () => {
      // Arrange
      prisma.read.inquiry.findUnique.mockResolvedValue(mockInquiry);
      prisma.write.inquiry.update.mockResolvedValue({
        ...mockInquiry,
        ...updateDto,
      });

      // Act
      const result = await service.update(inquiryId, updateDto);

      // Assert
      expect(result).toBeDefined();
      expect(prisma.write.inquiry.update).toHaveBeenCalledWith({
        where: { id: inquiryId },
        data: expect.objectContaining({
          status: updateDto.status,
          notes: updateDto.notes,
          updated_at: expect.any(Date),
        }),
        include: {
          customer: true,
          channel: true,
        },
      });
    });

    it('should set completed_at when status is COMPLETED', async () => {
      // Arrange
      const completedDto: UpdateInquiryDto = {
        status: 'COMPLETED',
      };
      prisma.read.inquiry.findUnique.mockResolvedValue(mockInquiry);
      prisma.write.inquiry.update.mockResolvedValue({
        ...mockInquiry,
        status: 'COMPLETED',
        completed_at: new Date(),
      });

      // Act
      await service.update(inquiryId, completedDto);

      // Assert
      expect(prisma.write.inquiry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: inquiryId },
          data: expect.objectContaining({
            status: 'COMPLETED',
            completed_at: expect.any(Date),
            updated_at: expect.any(Date),
          }),
          include: {
            customer: true,
            channel: true,
          },
        })
      );
    });

    it('should throw NotFoundException when inquiry not found', async () => {
      // Arrange
      prisma.read.inquiry.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(inquiryId, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const inquiryId = 'inquiry-123';

    it('should soft delete inquiry successfully', async () => {
      // Arrange
      prisma.read.inquiry.findUnique.mockResolvedValue({
        ...mockInquiry,
        status: 'COMPLETED',
      });
      prisma.write.inquiry.update.mockResolvedValue({
        ...mockInquiry,
        deleted_at: new Date(),
      });

      // Act
      const result = await service.remove(inquiryId);

      // Assert
      expect(result.message).toBe('Inquiry deleted successfully');
      expect(prisma.write.inquiry.update).toHaveBeenCalledWith({
        where: { id: inquiryId },
        data: {
          deleted_at: expect.any(Date),
        },
      });
    });

    it('should throw BadRequestException when inquiry is in progress', async () => {
      // Arrange
      prisma.read.inquiry.findUnique.mockResolvedValue({
        ...mockInquiry,
        status: 'IN_PROGRESS',
      });

      // Act & Assert
      await expect(service.remove(inquiryId)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when inquiry not found', async () => {
      // Arrange
      prisma.read.inquiry.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove(inquiryId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('analyzeWithAi', () => {
    const inquiryId = 'inquiry-123';
    const mockAnalysisResult = {
      type: '예약 문의',
      summary: 'Test summary',
      extracted_info: { desired_date: '2025-01-20' },
      sentiment: 'positive',
      urgency: 'medium',
      suggested_reply: 'Test reply',
      confidence: 0.9,
    };

    it('should analyze inquiry with AI successfully', async () => {
      // Arrange
      prisma.read.inquiry.findUnique.mockResolvedValue(mockInquiry);
      prisma.read.business.findUnique.mockResolvedValue(mockBusiness);
      aiService.analyzeInquiry.mockResolvedValue(mockAnalysisResult);
      prisma.write.inquiry.update.mockResolvedValue({
        ...mockInquiry,
        ...mockAnalysisResult,
        analyzed_at: new Date(),
        status: 'IN_PROGRESS',
      });

      // Act
      const result = await service.analyzeWithAi(inquiryId);

      // Assert
      expect(result).toBeDefined();
      expect(aiService.analyzeInquiry).toHaveBeenCalledWith({
        message: mockInquiry.message_text,
        industryType: mockBusiness.industry_type,
      });
      expect(prisma.write.inquiry.update).toHaveBeenCalledWith({
        where: { id: inquiryId },
        data: expect.objectContaining({
          type: mockAnalysisResult.type,
          summary: mockAnalysisResult.summary,
          sentiment: mockAnalysisResult.sentiment,
          urgency: mockAnalysisResult.urgency,
          analyzed_at: expect.any(Date),
          status: 'IN_PROGRESS',
        }),
      });
    });

    it('should throw NotFoundException when inquiry not found', async () => {
      // Arrange
      prisma.read.inquiry.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.analyzeWithAi(inquiryId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when business not found', async () => {
      // Arrange
      prisma.read.inquiry.findUnique.mockResolvedValue(mockInquiry);
      prisma.read.business.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.analyzeWithAi(inquiryId)).rejects.toThrow(NotFoundException);
    });

    it('should warn when inquiry already analyzed', async () => {
      // Arrange
      prisma.read.inquiry.findUnique.mockResolvedValue({
        ...mockInquiry,
        analyzed_at: new Date(),
      });
      prisma.read.business.findUnique.mockResolvedValue(mockBusiness);
      aiService.analyzeInquiry.mockResolvedValue(mockAnalysisResult);
      prisma.write.inquiry.update.mockResolvedValue(mockInquiry);

      // Act
      await service.analyzeWithAi(inquiryId);

      // Assert
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('sendReply', () => {
    const inquiryId = 'inquiry-123';
    const replyText = 'Test reply message';
    const senderId = 'user-123';

    it('should send reply successfully', async () => {
      // Arrange
      prisma.read.inquiry.findUnique.mockResolvedValue(mockInquiry);
      prisma.write.$transaction.mockImplementation(async callback => {
        return callback({
          inquiryReply: {
            create: jest.fn().mockResolvedValue({}),
          },
          inquiry: {
            update: jest.fn().mockResolvedValue({
              ...mockInquiry,
              reply_text: replyText,
              replied_at: new Date(),
              status: 'IN_PROGRESS',
            }),
          },
        });
      });

      // Act
      const result = await service.sendReply(inquiryId, replyText, senderId);

      // Assert
      expect(result).toBeDefined();
      expect(result.reply_text).toBe(replyText);
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should create reply with AI sender type when senderId not provided', async () => {
      // Arrange
      prisma.read.inquiry.findUnique.mockResolvedValue(mockInquiry);
      let createdReply: { sender_type: string; sender_id?: string } | undefined;
      prisma.write.$transaction.mockImplementation(async callback => {
        return callback({
          inquiryReply: {
            create: jest.fn().mockImplementation(data => {
              createdReply = data.data as { sender_type: string; sender_id?: string };
              return Promise.resolve({});
            }),
          },
          inquiry: {
            update: jest.fn().mockResolvedValue(mockInquiry),
          },
        });
      });

      // Act
      await service.sendReply(inquiryId, replyText);

      // Assert
      expect(createdReply).toBeDefined();
      expect(createdReply?.sender_type).toBe('AI');
      expect(createdReply?.sender_id).toBeUndefined();
    });

    it('should throw NotFoundException when inquiry not found', async () => {
      // Arrange
      prisma.read.inquiry.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.sendReply(inquiryId, replyText)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    const businessId = 'business-123';

    it('should return cached stats when available', async () => {
      // Arrange
      const cachedStats = {
        total: 100,
        byStatus: [{ status: 'NEW', count: 50 }],
      };
      cacheService.get.mockResolvedValue(cachedStats);

      // Act
      const result = await service.getStats(businessId);

      // Assert
      expect(result).toEqual(cachedStats);
      expect(prisma.read.inquiry.count).not.toHaveBeenCalled();
    });

    it('should calculate and cache stats when not cached', async () => {
      // Arrange
      cacheService.get.mockResolvedValue(null);
      prisma.read.inquiry.count.mockResolvedValue(100);
      prisma.read.inquiry.groupBy
        .mockResolvedValueOnce([{ status: 'NEW', _count: 50 }])
        .mockResolvedValueOnce([{ sentiment: 'positive', _count: 30 }])
        .mockResolvedValueOnce([{ urgency: 'high', _count: 10 }])
        .mockResolvedValueOnce([{ type: '예약', _count: 40 }]);
      cacheService.set.mockResolvedValue(undefined);

      // Act
      const result = await service.getStats(businessId);

      // Assert
      interface StatsResult {
        total: number;
        byStatus: Array<{ status: string; count: number }>;
      }
      const statsResult = result as StatsResult;
      expect(statsResult.total).toBe(100);
      expect(statsResult.byStatus).toHaveLength(1);
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        CACHE_TTL.INQUIRY_STATS
      );
    });

    it('should filter by date range', async () => {
      // Arrange
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      cacheService.get.mockResolvedValue(null);
      prisma.read.inquiry.count.mockResolvedValue(50);
      prisma.read.inquiry.groupBy.mockResolvedValue([]);

      // Act
      await service.getStats(businessId, startDate, endDate);

      // Assert
      expect(prisma.read.inquiry.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          business_id: businessId,
          received_at: {
            gte: startDate,
            lte: endDate,
          },
        }),
      });
    });
  });

  describe('updateStatus', () => {
    const inquiryId = 'inquiry-123';

    it('should update status successfully', async () => {
      // Arrange
      prisma.read.inquiry.findUnique
        .mockResolvedValueOnce(mockInquiry)
        .mockResolvedValueOnce(mockInquiry);
      prisma.write.inquiry.update.mockResolvedValue({
        ...mockInquiry,
        status: 'IN_PROGRESS',
      });
      cacheService.delPattern.mockResolvedValue(undefined);

      // Act
      const result = await service.updateStatus(inquiryId, 'IN_PROGRESS');

      // Assert
      expect(result.status).toBe('IN_PROGRESS');
      expect(cacheService.delPattern).toHaveBeenCalled();
    });

    it('should set completed_at when status is COMPLETED', async () => {
      // Arrange
      prisma.read.inquiry.findUnique
        .mockResolvedValueOnce(mockInquiry)
        .mockResolvedValueOnce(mockInquiry);
      prisma.write.inquiry.update.mockResolvedValue({
        ...mockInquiry,
        status: 'COMPLETED',
        completed_at: new Date(),
      });
      cacheService.delPattern.mockResolvedValue(undefined);

      // Act
      await service.updateStatus(inquiryId, 'COMPLETED');

      // Assert
      expect(prisma.write.inquiry.update).toHaveBeenCalledWith({
        where: { id: inquiryId },
        data: expect.objectContaining({
          status: 'COMPLETED',
          completed_at: expect.any(Date),
        }),
      });
    });
  });
});
