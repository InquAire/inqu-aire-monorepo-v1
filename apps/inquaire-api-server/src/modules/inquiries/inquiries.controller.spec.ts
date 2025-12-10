/**
 * InquiriesController Unit Tests
 *
 * 테스트 범위:
 * - CRUD 엔드포인트
 * - 페이지네이션
 * - 검색/필터
 * - 통계 조회
 * - AI 분석 실행
 * - 에러 핸들링
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';

import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { GetStatsQueryDto } from './dto/get-stats-query.dto';
import { QueryInquiryDto } from './dto/query-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';
import { InquiriesController } from './inquiries.controller';
import { InquiriesService } from './inquiries.service';

describe('InquiriesController', () => {
  let controller: InquiriesController;
  let inquiriesService: jest.Mocked<InquiriesService>;

  const mockChannel = {
    id: 'channel-123',
    business_id: 'business-123',
    name: 'Test Channel',
    platform: 'KAKAO' as const,
    deleted_at: null,
  };

  const mockCustomer = {
    id: 'customer-123',
    business_id: 'business-123',
    platform_user_id: 'user-123',
    platform: 'KAKAO' as const,
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
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    channel: mockChannel,
    customer: mockCustomer,
    business: mockBusiness,
  };

  const mockCreateDto: CreateInquiryDto = {
    business_id: 'business-123',
    channel_id: 'channel-123',
    customer_id: 'customer-123',
    message_text: 'Test message',
    platform_message_id: 'msg-123',
  };

  const mockUpdateDto: UpdateInquiryDto = {
    reply_text: 'Reply message',
    status: 'COMPLETED' as const,
  };

  beforeEach(() => {
    const mockInquiriesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getStats: jest.fn(),
      analyzeWithAi: jest.fn(),
    };

    // Direct instantiation to avoid decorator dependency issues
    controller = new InquiriesController(mockInquiriesService as unknown as InquiriesService);
    inquiriesService = mockInquiriesService as unknown as jest.Mocked<InquiriesService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(controller.create).toBeDefined();
    });

    it('should successfully create an inquiry', async () => {
      // Arrange
      inquiriesService.create.mockResolvedValue(
        mockInquiry as unknown as Awaited<ReturnType<InquiriesService['create']>>
      );

      // Act
      const result = await controller.create(mockCreateDto);

      // Assert
      expect(result).toEqual(mockInquiry);
      expect(inquiriesService.create).toHaveBeenCalledWith(mockCreateDto);
      expect(inquiriesService.create).toHaveBeenCalledTimes(1);
    });

    it('should pass all DTO fields to service', async () => {
      // Arrange
      const fullDto: CreateInquiryDto = {
        business_id: 'business-456',
        channel_id: 'channel-456',
        customer_id: 'customer-456',
        message_text: 'Full message',
        platform_message_id: 'msg-456',
        extracted_info: { key: 'value' },
      };
      inquiriesService.create.mockResolvedValue(
        mockInquiry as unknown as Awaited<ReturnType<InquiriesService['create']>>
      );

      // Act
      await controller.create(fullDto);

      // Assert
      expect(inquiriesService.create).toHaveBeenCalledWith(fullDto);
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new BadRequestException('Invalid data');
      inquiriesService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(mockCreateDto)).rejects.toThrow(BadRequestException);
      expect(inquiriesService.create).toHaveBeenCalled();
    });

    it('should handle NotFoundException from service', async () => {
      // Arrange
      const error = new NotFoundException('Channel not found');
      inquiriesService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(mockCreateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    const mockQueryDto: QueryInquiryDto = {
      business_id: 'business-123',
      page: 1,
      limit: 20,
    };

    const mockPaginatedResult = {
      data: [mockInquiry],
      meta: {
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    };

    it('should be defined', () => {
      expect(controller.findAll).toBeDefined();
    });

    it('should successfully get all inquiries', async () => {
      // Arrange
      inquiriesService.findAll.mockResolvedValue(
        mockPaginatedResult as unknown as Awaited<ReturnType<InquiriesService['findAll']>>
      );

      // Act
      const result = await controller.findAll(mockQueryDto);

      // Assert
      expect(result).toEqual(mockPaginatedResult);
      expect(inquiriesService.findAll).toHaveBeenCalledWith(mockQueryDto);
    });

    it('should handle pagination parameters', async () => {
      // Arrange
      const queryWithPagination: QueryInquiryDto = {
        page: 2,
        limit: 10,
      };
      inquiriesService.findAll.mockResolvedValue(
        mockPaginatedResult as unknown as Awaited<ReturnType<InquiriesService['findAll']>>
      );

      // Act
      await controller.findAll(queryWithPagination);

      // Assert
      expect(inquiriesService.findAll).toHaveBeenCalledWith(queryWithPagination);
    });

    it('should handle filtering by status', async () => {
      // Arrange
      const queryWithStatus: QueryInquiryDto = {
        status: 'COMPLETED',
        page: 1,
        limit: 20,
      };
      inquiriesService.findAll.mockResolvedValue(
        mockPaginatedResult as unknown as Awaited<ReturnType<InquiriesService['findAll']>>
      );

      // Act
      await controller.findAll(queryWithStatus);

      // Assert
      expect(inquiriesService.findAll).toHaveBeenCalledWith(queryWithStatus);
    });

    it('should handle filtering by business_id', async () => {
      // Arrange
      const queryWithBusiness: QueryInquiryDto = {
        business_id: 'business-123',
        page: 1,
        limit: 20,
      };
      inquiriesService.findAll.mockResolvedValue(
        mockPaginatedResult as unknown as Awaited<ReturnType<InquiriesService['findAll']>>
      );

      // Act
      await controller.findAll(queryWithBusiness);

      // Assert
      expect(inquiriesService.findAll).toHaveBeenCalledWith(queryWithBusiness);
    });

    it('should handle filtering by channel_id', async () => {
      // Arrange
      const queryWithChannel: QueryInquiryDto = {
        channel_id: 'channel-123',
        page: 1,
        limit: 20,
      };
      inquiriesService.findAll.mockResolvedValue(
        mockPaginatedResult as unknown as Awaited<ReturnType<InquiriesService['findAll']>>
      );

      // Act
      await controller.findAll(queryWithChannel);

      // Assert
      expect(inquiriesService.findAll).toHaveBeenCalledWith(queryWithChannel);
    });

    it('should handle filtering by customer_id', async () => {
      // Arrange
      const queryWithCustomer: QueryInquiryDto = {
        customer_id: 'customer-123',
        page: 1,
        limit: 20,
      };
      inquiriesService.findAll.mockResolvedValue(
        mockPaginatedResult as unknown as Awaited<ReturnType<InquiriesService['findAll']>>
      );

      // Act
      await controller.findAll(queryWithCustomer);

      // Assert
      expect(inquiriesService.findAll).toHaveBeenCalledWith(queryWithCustomer);
    });

    it('should handle search query', async () => {
      // Arrange
      const queryWithSearch: QueryInquiryDto = {
        search: 'test keyword',
        page: 1,
        limit: 20,
      };
      inquiriesService.findAll.mockResolvedValue(
        mockPaginatedResult as unknown as Awaited<ReturnType<InquiriesService['findAll']>>
      );

      // Act
      await controller.findAll(queryWithSearch);

      // Assert
      expect(inquiriesService.findAll).toHaveBeenCalledWith(queryWithSearch);
    });

    it('should handle sorting parameters', async () => {
      // Arrange
      const queryWithSort: QueryInquiryDto = {
        sortBy: 'received_at',
        sortOrder: 'asc',
        page: 1,
        limit: 20,
      };
      inquiriesService.findAll.mockResolvedValue(
        mockPaginatedResult as unknown as Awaited<ReturnType<InquiriesService['findAll']>>
      );

      // Act
      await controller.findAll(queryWithSort);

      // Assert
      expect(inquiriesService.findAll).toHaveBeenCalledWith(queryWithSort);
    });

    it('should handle empty query object', async () => {
      // Arrange
      const emptyQuery: QueryInquiryDto = {};
      inquiriesService.findAll.mockResolvedValue(
        mockPaginatedResult as unknown as Awaited<ReturnType<InquiriesService['findAll']>>
      );

      // Act
      await controller.findAll(emptyQuery);

      // Assert
      expect(inquiriesService.findAll).toHaveBeenCalledWith(emptyQuery);
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database error');
      inquiriesService.findAll.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findAll(mockQueryDto)).rejects.toThrow('Database error');
    });
  });

  describe('findOne', () => {
    const inquiryId = 'inquiry-123';

    it('should be defined', () => {
      expect(controller.findOne).toBeDefined();
    });

    it('should successfully get an inquiry by id', async () => {
      // Arrange
      inquiriesService.findOne.mockResolvedValue(
        mockInquiry as unknown as Awaited<ReturnType<InquiriesService['findOne']>>
      );

      // Act
      const result = await controller.findOne(inquiryId);

      // Assert
      expect(result).toEqual(mockInquiry);
      expect(inquiriesService.findOne).toHaveBeenCalledWith(inquiryId);
      expect(inquiriesService.findOne).toHaveBeenCalledTimes(1);
    });

    it('should handle NotFoundException when inquiry not found', async () => {
      // Arrange
      const error = new NotFoundException('Inquiry not found');
      inquiriesService.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findOne(inquiryId)).rejects.toThrow(NotFoundException);
      await expect(controller.findOne(inquiryId)).rejects.toThrow('Inquiry not found');
    });

    it('should handle different inquiry IDs', async () => {
      // Arrange
      const ids = ['inquiry-1', 'inquiry-2', 'inquiry-3'];
      inquiriesService.findOne.mockResolvedValue(
        mockInquiry as unknown as Awaited<ReturnType<InquiriesService['findOne']>>
      );

      // Act
      for (const id of ids) {
        await controller.findOne(id);
      }

      // Assert
      expect(inquiriesService.findOne).toHaveBeenCalledTimes(3);
      expect(inquiriesService.findOne).toHaveBeenCalledWith('inquiry-1');
      expect(inquiriesService.findOne).toHaveBeenCalledWith('inquiry-2');
      expect(inquiriesService.findOne).toHaveBeenCalledWith('inquiry-3');
    });
  });

  describe('update', () => {
    const inquiryId = 'inquiry-123';

    it('should be defined', () => {
      expect(controller.update).toBeDefined();
    });

    it('should successfully update an inquiry', async () => {
      // Arrange
      const updatedInquiry = {
        ...mockInquiry,
        reply_text: 'Reply message',
        status: 'COMPLETED',
        updated_at: new Date(),
      };
      inquiriesService.update.mockResolvedValue(
        updatedInquiry as unknown as Awaited<ReturnType<InquiriesService['update']>>
      );

      // Act
      const result = await controller.update(inquiryId, mockUpdateDto);

      // Assert
      expect(result).toEqual(updatedInquiry);
      expect(inquiriesService.update).toHaveBeenCalledWith(inquiryId, mockUpdateDto);
    });

    it('should pass all update fields to service', async () => {
      // Arrange
      const fullUpdateDto: UpdateInquiryDto = {
        reply_text: 'Full reply',
        status: 'COMPLETED',
        summary: 'Summary text',
        type: '예약 문의',
        notes: 'Admin notes',
        extracted_info: { key: 'value' },
      };
      inquiriesService.update.mockResolvedValue(
        mockInquiry as unknown as Awaited<ReturnType<InquiriesService['update']>>
      );

      // Act
      await controller.update(inquiryId, fullUpdateDto);

      // Assert
      expect(inquiriesService.update).toHaveBeenCalledWith(inquiryId, fullUpdateDto);
    });

    it('should handle partial updates', async () => {
      // Arrange
      const partialUpdate: UpdateInquiryDto = {
        reply_text: 'Only reply',
      };
      inquiriesService.update.mockResolvedValue(
        mockInquiry as unknown as Awaited<ReturnType<InquiriesService['update']>>
      );

      // Act
      await controller.update(inquiryId, partialUpdate);

      // Assert
      expect(inquiriesService.update).toHaveBeenCalledWith(inquiryId, partialUpdate);
    });

    it('should handle NotFoundException when inquiry not found', async () => {
      // Arrange
      const error = new NotFoundException('Inquiry not found');
      inquiriesService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update(inquiryId, mockUpdateDto)).rejects.toThrow(NotFoundException);
    });

    it('should handle BadRequestException from service', async () => {
      // Arrange
      const error = new BadRequestException('Invalid status');
      inquiriesService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update(inquiryId, mockUpdateDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('remove', () => {
    const inquiryId = 'inquiry-123';

    it('should be defined', () => {
      expect(controller.remove).toBeDefined();
    });

    it('should successfully delete an inquiry', async () => {
      // Arrange
      const deleteResult = {
        message: 'Inquiry deleted successfully',
        id: inquiryId,
      };
      inquiriesService.remove.mockResolvedValue(deleteResult);

      // Act
      const result = await controller.remove(inquiryId);

      // Assert
      expect(result).toEqual(deleteResult);
      expect(inquiriesService.remove).toHaveBeenCalledWith(inquiryId);
      expect(inquiriesService.remove).toHaveBeenCalledTimes(1);
    });

    it('should handle NotFoundException when inquiry not found', async () => {
      // Arrange
      const error = new NotFoundException('Inquiry not found');
      inquiriesService.remove.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.remove(inquiryId)).rejects.toThrow(NotFoundException);
      await expect(controller.remove(inquiryId)).rejects.toThrow('Inquiry not found');
    });

    it('should handle different inquiry IDs', async () => {
      // Arrange
      const ids = ['inquiry-1', 'inquiry-2'];
      inquiriesService.remove.mockResolvedValue(
        mockInquiry as unknown as Awaited<ReturnType<InquiriesService['remove']>>
      );

      // Act
      for (const id of ids) {
        await controller.remove(id);
      }

      // Assert
      expect(inquiriesService.remove).toHaveBeenCalledTimes(2);
      expect(inquiriesService.remove).toHaveBeenCalledWith('inquiry-1');
      expect(inquiriesService.remove).toHaveBeenCalledWith('inquiry-2');
    });
  });

  describe('getStats', () => {
    const mockStatsQuery: GetStatsQueryDto = {
      business_id: 'business-123',
    };

    const mockStatsResult = {
      business_id: 'business-123',
      period: {
        start: undefined as Date | undefined,
        end: undefined as Date | undefined,
      },
      total: 100,
      byStatus: [{ status: 'NEW' as const, count: 50 }],
      bySentiment: [{ sentiment: 'positive', count: 30 }],
      byUrgency: [{ urgency: 'high', count: 20 }],
      byType: [{ type: '예약 문의', count: 40 }],
    };

    it('should be defined', () => {
      expect(controller.getStats).toBeDefined();
    });

    it('should successfully get statistics', async () => {
      // Arrange
      inquiriesService.getStats.mockResolvedValue(mockStatsResult);

      // Act
      const result = await controller.getStats(mockStatsQuery);

      // Assert
      expect(result).toEqual(mockStatsResult);
      expect(inquiriesService.getStats).toHaveBeenCalledWith(
        mockStatsQuery.business_id,
        undefined,
        undefined
      );
    });

    it('should handle date range query', async () => {
      // Arrange
      const queryWithDates: GetStatsQueryDto = {
        business_id: 'business-123',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      };
      inquiriesService.getStats.mockResolvedValue(mockStatsResult);

      // Act
      await controller.getStats(queryWithDates);

      // Assert
      expect(inquiriesService.getStats).toHaveBeenCalledWith(
        queryWithDates.business_id,
        new Date(queryWithDates.start_date!),
        new Date(queryWithDates.end_date!)
      );
    });

    it('should handle start_date only', async () => {
      // Arrange
      const queryWithStartDate: GetStatsQueryDto = {
        business_id: 'business-123',
        start_date: '2025-01-01',
      };
      inquiriesService.getStats.mockResolvedValue(mockStatsResult);

      // Act
      await controller.getStats(queryWithStartDate);

      // Assert
      expect(inquiriesService.getStats).toHaveBeenCalledWith(
        queryWithStartDate.business_id,
        new Date(queryWithStartDate.start_date!),
        undefined
      );
    });

    it('should handle end_date only', async () => {
      // Arrange
      const queryWithEndDate: GetStatsQueryDto = {
        business_id: 'business-123',
        end_date: '2025-01-31',
      };
      inquiriesService.getStats.mockResolvedValue(mockStatsResult);

      // Act
      await controller.getStats(queryWithEndDate);

      // Assert
      expect(inquiriesService.getStats).toHaveBeenCalledWith(
        queryWithEndDate.business_id,
        undefined,
        new Date(queryWithEndDate.end_date!)
      );
    });

    it('should convert date strings to Date objects', async () => {
      // Arrange
      const queryWithDates: GetStatsQueryDto = {
        business_id: 'business-123',
        start_date: '2025-01-01T00:00:00Z',
        end_date: '2025-01-31T23:59:59Z',
      };
      inquiriesService.getStats.mockResolvedValue(mockStatsResult);

      // Act
      await controller.getStats(queryWithDates);

      // Assert
      expect(inquiriesService.getStats).toHaveBeenCalledWith(
        queryWithDates.business_id,
        new Date(queryWithDates.start_date!),
        new Date(queryWithDates.end_date!)
      );
    });

    it('should handle different business IDs', async () => {
      // Arrange
      const businessIds = ['business-1', 'business-2'];
      inquiriesService.getStats.mockResolvedValue(mockStatsResult);

      // Act
      for (const businessId of businessIds) {
        await controller.getStats({ business_id: businessId });
      }

      // Assert
      expect(inquiriesService.getStats).toHaveBeenCalledTimes(2);
      expect(inquiriesService.getStats).toHaveBeenCalledWith('business-1', undefined, undefined);
      expect(inquiriesService.getStats).toHaveBeenCalledWith('business-2', undefined, undefined);
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Database error');
      inquiriesService.getStats.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getStats(mockStatsQuery)).rejects.toThrow('Database error');
    });
  });

  describe('analyzeWithAi', () => {
    const inquiryId = 'inquiry-123';

    const mockAnalysisResult = {
      ...mockInquiry,
      type: '예약 문의',
      summary: '예약 문의입니다',
      sentiment: 'positive',
      urgency: 'medium',
      ai_confidence: 0.9,
      analyzed_at: new Date(),
      status: 'IN_PROGRESS',
    };

    it('should be defined', () => {
      expect(controller.analyzeWithAi).toBeDefined();
    });

    it('should successfully trigger AI analysis', async () => {
      // Arrange
      inquiriesService.analyzeWithAi.mockResolvedValue(
        mockAnalysisResult as unknown as Awaited<ReturnType<InquiriesService['analyzeWithAi']>>
      );

      // Act
      const result = await controller.analyzeWithAi(inquiryId);

      // Assert
      expect(result).toEqual(mockAnalysisResult);
      expect(inquiriesService.analyzeWithAi).toHaveBeenCalledWith(inquiryId);
      expect(inquiriesService.analyzeWithAi).toHaveBeenCalledTimes(1);
    });

    it('should handle NotFoundException when inquiry not found', async () => {
      // Arrange
      const error = new NotFoundException('Inquiry not found');
      inquiriesService.analyzeWithAi.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.analyzeWithAi(inquiryId)).rejects.toThrow(NotFoundException);
      await expect(controller.analyzeWithAi(inquiryId)).rejects.toThrow('Inquiry not found');
    });

    it('should handle BadRequestException from service', async () => {
      // Arrange
      const error = new BadRequestException('Inquiry already analyzed');
      inquiriesService.analyzeWithAi.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.analyzeWithAi(inquiryId)).rejects.toThrow(BadRequestException);
    });

    it('should handle different inquiry IDs', async () => {
      // Arrange
      const ids = ['inquiry-1', 'inquiry-2', 'inquiry-3'];
      inquiriesService.analyzeWithAi.mockResolvedValue(
        mockAnalysisResult as unknown as Awaited<ReturnType<InquiriesService['analyzeWithAi']>>
      );

      // Act
      for (const id of ids) {
        await controller.analyzeWithAi(id);
      }

      // Assert
      expect(inquiriesService.analyzeWithAi).toHaveBeenCalledTimes(3);
      expect(inquiriesService.analyzeWithAi).toHaveBeenCalledWith('inquiry-1');
      expect(inquiriesService.analyzeWithAi).toHaveBeenCalledWith('inquiry-2');
      expect(inquiriesService.analyzeWithAi).toHaveBeenCalledWith('inquiry-3');
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const error = new Error('AI service unavailable');
      inquiriesService.analyzeWithAi.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.analyzeWithAi(inquiryId)).rejects.toThrow('AI service unavailable');
    });
  });

  describe('Integration with Service', () => {
    it('should correctly pass all parameters to create service', async () => {
      // Arrange
      inquiriesService.create.mockResolvedValue(
        mockInquiry as unknown as Awaited<ReturnType<InquiriesService['create']>>
      );

      // Act
      await controller.create(mockCreateDto);

      // Assert
      expect(inquiriesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          business_id: 'business-123',
          channel_id: 'channel-123',
          customer_id: 'customer-123',
          message_text: 'Test message',
        })
      );
    });

    it('should correctly pass all parameters to update service', async () => {
      // Arrange
      inquiriesService.update.mockResolvedValue(
        mockInquiry as unknown as Awaited<ReturnType<InquiriesService['update']>>
      );

      // Act
      await controller.update('inquiry-123', mockUpdateDto);

      // Assert
      expect(inquiriesService.update).toHaveBeenCalledWith(
        'inquiry-123',
        expect.objectContaining({
          reply_text: 'Reply message',
          status: 'COMPLETED',
        })
      );
    });

    it('should correctly pass query parameters to findAll service', async () => {
      // Arrange
      const query: QueryInquiryDto = {
        business_id: 'business-123',
        status: 'NEW',
        search: 'test',
        page: 1,
        limit: 20,
        sortBy: 'received_at',
        sortOrder: 'desc',
      };
      inquiriesService.findAll.mockResolvedValue({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0, hasNext: false, hasPrev: false },
      });

      // Act
      await controller.findAll(query);

      // Assert
      expect(inquiriesService.findAll).toHaveBeenCalledWith(query);
    });
  });
});
