/**
 * Inquiries Integration Tests
 *
 * 테스트 범위:
 * - 인증 → 문의 생성 → 조회 → 업데이트 → 삭제
 * - 페이지네이션 + 필터링
 * - 상태 업데이트
 * - 통계 조회
 *
 * 주의: 이 테스트는 실제 데이터베이스 연결이 필요합니다.
 * 테스트 환경에서는 테스트 전용 데이터베이스를 사용해야 합니다.
 */

import 'reflect-metadata';

import { IndustryType, InquiryStatus } from '@prisma/generated';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';

import { CacheService } from '@/common/modules/cache/cache.service';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';
import { AiService } from '@/modules/ai/ai.service';
import { CustomersService } from '@/modules/customers/customers.service';
import { CreateInquiryDto } from '@/modules/inquiries/dto/create-inquiry.dto';
import { QueryInquiryDto } from '@/modules/inquiries/dto/query-inquiry.dto';
import { UpdateInquiryDto } from '@/modules/inquiries/dto/update-inquiry.dto';
import { InquiriesService } from '@/modules/inquiries/inquiries.service';

describe('Inquiries Integration', () => {
  let prismaService: PrismaService | null;
  let inquiriesService: InquiriesService | null;
  let module: TestingModule;
  let isDatabaseAvailable = false;

  // Test data
  let testUserId: string;
  let testBusinessId: string;
  let testChannelId: string;
  let testCustomerId: string;
  const testInquiryIds: string[] = [];

  beforeAll(async () => {
    // 테스트 환경 변수 설정
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL =
      process.env.TEST_DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/inquaire_test';

    const mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      logWithLevel: jest.fn(),
      logHttpRequest: jest.fn(),
      logDatabaseQuery: jest.fn(),
      logBusinessEvent: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      delPattern: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn().mockResolvedValue(undefined),
      generateKey: jest.fn(
        (prefix: string, ...parts: (string | number)[]) => `${prefix}:${parts.join(':')}`
      ),
    };

    const mockAiService = {
      analyzeInquiry: jest.fn(),
    };

    const mockCustomersService = {
      findOne: jest.fn(),
    };

    const mockAiAnalysisQueue = {
      add: jest.fn(),
    } as unknown as Queue;

    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        PrismaService,
        InquiriesService,
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: AiService,
          useValue: mockAiService,
        },
        {
          provide: CustomersService,
          useValue: mockCustomersService,
        },
        {
          provide: 'BullQueue_ai-analysis',
          useValue: mockAiAnalysisQueue,
        },
      ],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    inquiriesService = module.get<InquiriesService>(InquiriesService);

    // 데이터베이스 연결
    try {
      await prismaService.onModuleInit();
      isDatabaseAvailable = true;

      // 테스트용 User 생성
      const user = await prismaService.write.user.create({
        data: {
          email: 'test-inquiry@example.com',
          password_hash: 'test-hash',
          name: 'Test User for Inquiries',
        },
      });
      testUserId = user.id;

      // 테스트용 Business 생성
      const business = await prismaService.write.business.create({
        data: {
          name: 'Test Business for Inquiries',
          owner_id: testUserId,
          industry_type: IndustryType.OTHER,
        },
      });
      testBusinessId = business.id;

      // 테스트용 Channel 생성
      const channel = await prismaService.write.channel.create({
        data: {
          business_id: testBusinessId,
          name: 'Test Channel for Inquiries',
          platform: 'KAKAO',
          platform_channel_id: 'test-channel-id',
          access_token: 'test-token',
        },
      });
      testChannelId = channel.id;

      // 테스트용 Customer 생성
      const customer = await prismaService.write.customer.create({
        data: {
          business_id: testBusinessId,
          platform_user_id: 'test-platform-user',
          platform: 'KAKAO',
          name: 'Test Customer',
          first_contact: new Date(),
          last_contact: new Date(),
          inquiry_count: 0,
        },
      });
      testCustomerId = customer.id;
    } catch (error) {
      console.warn(
        'Database connection failed, skipping integration tests. Set TEST_DATABASE_URL to run integration tests.',
        error
      );
      prismaService = null;
      inquiriesService = null;
      isDatabaseAvailable = false;
    }
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    if (prismaService && isDatabaseAvailable) {
      try {
        // Inquiries 삭제
        if (testInquiryIds.length > 0) {
          await prismaService.write.inquiry.deleteMany({
            where: { id: { in: testInquiryIds } },
          });
        }

        // Customer 삭제
        if (testCustomerId) {
          await prismaService.write.customer.deleteMany({
            where: { id: testCustomerId },
          });
        }

        // Channel 삭제
        if (testChannelId) {
          await prismaService.write.channel.deleteMany({
            where: { id: testChannelId },
          });
        }

        // Business 삭제
        if (testBusinessId) {
          await prismaService.write.business.deleteMany({
            where: { id: testBusinessId },
          });
        }

        // User 삭제
        if (testUserId) {
          await prismaService.write.user.deleteMany({
            where: { id: testUserId },
          });
        }

        await prismaService.onModuleDestroy();
      } catch (error) {
        console.warn('Database cleanup error:', error);
      }
    }
    if (module) {
      await module.close();
    }
  });

  describe('Create Inquiry', () => {
    it('should create a new inquiry', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const createDto: CreateInquiryDto = {
        business_id: testBusinessId,
        channel_id: testChannelId,
        customer_id: testCustomerId,
        message_text: 'Test inquiry message',
        platform_message_id: 'test-message-id',
      };

      // Act
      const inquiry = await inquiriesService.create(createDto);

      // Assert
      expect(inquiry).toBeDefined();
      expect(inquiry.id).toBeDefined();
      expect(inquiry.message_text).toBe('Test inquiry message');
      expect(inquiry.status).toBe(InquiryStatus.NEW);
      expect(inquiry.business_id).toBe(testBusinessId);
      expect(inquiry.channel_id).toBe(testChannelId);
      expect(inquiry.customer_id).toBe(testCustomerId);

      // Store for cleanup
      testInquiryIds.push(inquiry.id);

      // Verify customer was updated
      const customer = await prismaService.read.customer.findUnique({
        where: { id: testCustomerId },
      });
      expect(customer?.inquiry_count).toBeGreaterThan(0);
    });

    it('should create inquiry with extracted_info', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const createDto: CreateInquiryDto = {
        business_id: testBusinessId,
        channel_id: testChannelId,
        customer_id: testCustomerId,
        message_text: 'Test inquiry with extracted info',
        extracted_info: {
          name: 'John Doe',
          phone: '010-1234-5678',
        },
      };

      // Act
      const inquiry = await inquiriesService.create(createDto);

      // Assert
      expect(inquiry).toBeDefined();
      expect(inquiry.extracted_info).toBeDefined();
      expect((inquiry.extracted_info as { name?: string })?.name).toBe('John Doe');

      testInquiryIds.push(inquiry.id);
    });

    it('should throw error for non-existent channel', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const createDto: CreateInquiryDto = {
        business_id: testBusinessId,
        channel_id: 'non-existent-channel',
        customer_id: testCustomerId,
        message_text: 'Test message',
      };

      // Act & Assert
      await expect(inquiriesService.create(createDto)).rejects.toThrow('Channel not found');
    });

    it('should throw error for non-existent customer', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const createDto: CreateInquiryDto = {
        business_id: testBusinessId,
        channel_id: testChannelId,
        customer_id: 'non-existent-customer',
        message_text: 'Test message',
      };

      // Act & Assert
      await expect(inquiriesService.create(createDto)).rejects.toThrow('Customer not found');
    });

    it('should throw error when channel and customer belong to different businesses', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange - Create another business and customer
      const anotherBusiness = await prismaService.write.business.create({
        data: {
          name: 'Another Business',
          owner_id: testUserId,
          industry_type: IndustryType.OTHER,
        },
      });

      const anotherCustomer = await prismaService.write.customer.create({
        data: {
          business_id: anotherBusiness.id,
          platform_user_id: 'another-user',
          platform: 'KAKAO',
          name: 'Another Customer',
          first_contact: new Date(),
          last_contact: new Date(),
          inquiry_count: 0,
        },
      });

      const createDto: CreateInquiryDto = {
        business_id: testBusinessId,
        channel_id: testChannelId,
        customer_id: anotherCustomer.id,
        message_text: 'Test message',
      };

      // Act & Assert
      await expect(inquiriesService.create(createDto)).rejects.toThrow(
        'Channel and customer must belong to the same business'
      );

      // Cleanup
      await prismaService.write.customer.deleteMany({ where: { id: anotherCustomer.id } });
      await prismaService.write.business.deleteMany({ where: { id: anotherBusiness.id } });
    });
  });

  describe('Find All Inquiries', () => {
    beforeAll(async () => {
      if (isDatabaseAvailable && prismaService && inquiriesService) {
        // Create multiple inquiries for pagination tests
        for (let i = 0; i < 5; i++) {
          const createDto: CreateInquiryDto = {
            business_id: testBusinessId,
            channel_id: testChannelId,
            customer_id: testCustomerId,
            message_text: `Test inquiry message ${i + 1}`,
          };
          const inquiry = await inquiriesService.create(createDto);
          testInquiryIds.push(inquiry.id);

          // Update status for some inquiries
          if (i % 2 !== 0) {
            await inquiriesService.update(inquiry.id, {
              status: InquiryStatus.IN_PROGRESS,
            });
          }
        }
      }
    });

    it('should return paginated inquiries', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const query: QueryInquiryDto = {
        page: 1,
        limit: 2,
      };

      // Act
      const result = await inquiriesService.findAll(query);

      // Assert
      expect(result.data).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(result.meta.total).toBeGreaterThanOrEqual(5);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(2);
      expect(result.meta.totalPages).toBeGreaterThanOrEqual(3);
      expect(result.data.length).toBeLessThanOrEqual(2);
    });

    it('should filter by business_id', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const query: QueryInquiryDto = {
        business_id: testBusinessId,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await inquiriesService.findAll(query);

      // Assert
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(inquiry => {
        expect(inquiry.business_id).toBe(testBusinessId);
      });
    });

    it('should filter by status', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const query: QueryInquiryDto = {
        status: InquiryStatus.NEW,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await inquiriesService.findAll(query);

      // Assert
      result.data.forEach(inquiry => {
        expect(inquiry.status).toBe(InquiryStatus.NEW);
      });
    });

    it('should filter by channel_id', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const query: QueryInquiryDto = {
        channel_id: testChannelId,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await inquiriesService.findAll(query);

      // Assert
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(inquiry => {
        expect(inquiry.channel_id).toBe(testChannelId);
      });
    });

    it('should filter by customer_id', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const query: QueryInquiryDto = {
        customer_id: testCustomerId,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await inquiriesService.findAll(query);

      // Assert
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(inquiry => {
        expect(inquiry.customer_id).toBe(testCustomerId);
      });
    });

    it('should search by message text', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const query: QueryInquiryDto = {
        search: 'message 1',
        page: 1,
        limit: 10,
      };

      // Act
      const result = await inquiriesService.findAll(query);

      // Assert
      expect(result.data.length).toBeGreaterThan(0);
      result.data.forEach(inquiry => {
        expect(inquiry.message_text.toLowerCase()).toContain('message 1');
      });
    });

    it('should sort by received_at descending', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const query: QueryInquiryDto = {
        sortBy: 'received_at',
        sortOrder: 'desc',
        page: 1,
        limit: 10,
      };

      // Act
      const result = await inquiriesService.findAll(query);

      // Assert
      expect(result.data.length).toBeGreaterThan(1);
      for (let i = 0; i < result.data.length - 1; i++) {
        const current = result.data[i]?.received_at;
        const next = result.data[i + 1]?.received_at;
        if (current && next) {
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });

    it('should sort by received_at ascending', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const query: QueryInquiryDto = {
        sortBy: 'received_at',
        sortOrder: 'asc',
        page: 1,
        limit: 10,
      };

      // Act
      const result = await inquiriesService.findAll(query);

      // Assert
      expect(result.data.length).toBeGreaterThan(1);
      for (let i = 0; i < result.data.length - 1; i++) {
        const current = result.data[i]?.received_at;
        const next = result.data[i + 1]?.received_at;
        if (current && next) {
          expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
        }
      }
    });
  });

  describe('Find One Inquiry', () => {
    it('should return inquiry by id', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange - Create an inquiry
      const createDto: CreateInquiryDto = {
        business_id: testBusinessId,
        channel_id: testChannelId,
        customer_id: testCustomerId,
        message_text: 'Inquiry for findOne test',
      };
      const created = await inquiriesService.create(createDto);
      testInquiryIds.push(created.id);

      // Act
      const inquiry = await inquiriesService.findOne(created.id);

      // Assert
      expect(inquiry).toBeDefined();
      expect(inquiry?.id).toBe(created.id);
      expect(inquiry?.message_text).toBe('Inquiry for findOne test');
      expect(inquiry?.customer).toBeDefined();
      expect(inquiry?.channel).toBeDefined();
    });

    it('should throw error for non-existent inquiry', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Act & Assert
      await expect(inquiriesService.findOne('non-existent-id')).rejects.toThrow(
        /Inquiry.*not found/
      );
    });
  });

  describe('Update Inquiry', () => {
    it('should update inquiry status', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange - Create an inquiry
      const createDto: CreateInquiryDto = {
        business_id: testBusinessId,
        channel_id: testChannelId,
        customer_id: testCustomerId,
        message_text: 'Inquiry for update test',
      };
      const created = await inquiriesService.create(createDto);
      testInquiryIds.push(created.id);

      const updateDto: UpdateInquiryDto = {
        status: InquiryStatus.IN_PROGRESS,
      };

      // Act
      const updated = await inquiriesService.update(created.id, updateDto);

      // Assert
      expect(updated.status).toBe(InquiryStatus.IN_PROGRESS);
    });

    it('should update inquiry reply_text', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange - Create an inquiry
      const createDto: CreateInquiryDto = {
        business_id: testBusinessId,
        channel_id: testChannelId,
        customer_id: testCustomerId,
        message_text: 'Inquiry for reply test',
      };
      const created = await inquiriesService.create(createDto);
      testInquiryIds.push(created.id);

      const updateDto: UpdateInquiryDto = {
        reply_text: 'This is a test reply',
      };

      // Act
      const updated = await inquiriesService.update(created.id, updateDto);

      // Assert
      expect(updated.reply_text).toBe('This is a test reply');
    });

    it('should throw error for non-existent inquiry', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const updateDto: UpdateInquiryDto = {
        status: InquiryStatus.COMPLETED,
      };

      // Act & Assert
      await expect(inquiriesService.update('non-existent-id', updateDto)).rejects.toThrow(
        /Inquiry.*not found/
      );
    });
  });

  describe('Delete Inquiry', () => {
    it('should soft delete inquiry', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange - Create an inquiry
      const createDto: CreateInquiryDto = {
        business_id: testBusinessId,
        channel_id: testChannelId,
        customer_id: testCustomerId,
        message_text: 'Inquiry for delete test',
      };
      const created = await inquiriesService.create(createDto);
      testInquiryIds.push(created.id);

      // Act
      await inquiriesService.remove(created.id);

      // Assert - Inquiry should be soft deleted
      const inquiry = await prismaService.read.inquiry.findUnique({
        where: { id: created.id },
      });
      expect(inquiry?.deleted_at).toBeDefined();
      expect(inquiry?.deleted_at).not.toBeNull();
    });

    it('should throw error for non-existent inquiry', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Act & Assert
      await expect(inquiriesService.remove('non-existent-id')).rejects.toThrow(/Inquiry.*not found/);
    });
  });

  describe('Get Stats', () => {
    it('should return inquiry statistics', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Act
      const stats = await inquiriesService.getStats(testBusinessId);

      // Assert
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
      // Stats object should have business_id and various statistics
      expect(stats).toHaveProperty('business_id');
    });

    it('should filter stats by date range', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !inquiriesService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7 days ago
      const endDate = new Date();

      // Act
      const stats = await inquiriesService.getStats(testBusinessId, startDate, endDate);

      // Assert
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
      expect(stats).toHaveProperty('business_id');
    });
  });
});
