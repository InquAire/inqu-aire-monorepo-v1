/**
 * Webhooks Integration Tests
 *
 * 테스트 범위:
 * - Kakao 웹훅 → 문의 생성 → AI 답변 전체 흐름
 * - LINE 웹훅 → 문의 생성 → AI 답변 전체 흐름
 * - 고객 자동 생성/업데이트
 * - 중복 이벤트 방지
 * - 채널 조회 및 검증
 *
 * 주의: 이 테스트는 실제 데이터베이스 연결이 필요합니다.
 * 테스트 환경에서는 테스트 전용 데이터베이스를 사용해야 합니다.
 */

import 'reflect-metadata';

import { IndustryType } from '@prisma/generated';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';

import { CacheService } from '@/common/modules/cache/cache.service';
import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { MetricsService } from '@/common/modules/metrics/metrics.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';
import { KakaoWebhookDto } from '@/modules/webhooks/dto/kakao-webhook.dto';
import { LineWebhookDto } from '@/modules/webhooks/dto/line-webhook.dto';
import { WebhookReplayPreventionService } from '@/modules/webhooks/services/webhook-replay-prevention.service';
import { WebhooksService } from '@/modules/webhooks/webhooks.service';

describe('Webhooks Integration', () => {
  let prismaService: PrismaService | null;
  let webhooksService: WebhooksService | null;
  let module: TestingModule;
  let isDatabaseAvailable = false;

  // Test data
  let testUserId: string;
  let testBusinessId: string;
  let testChannelId: string;
  let testCustomerId: string | null = null;

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

    const mockMetricsService = {
      recordWebhookEvent: jest.fn(),
      recordInquiryCreated: jest.fn(),
    };

    const mockWebhookQueue = {
      add: jest.fn(),
    } as unknown as Queue;

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

    const mockReplayPrevention = {
      isDuplicate: jest.fn().mockResolvedValue(false),
      isTimestampValid: jest.fn().mockReturnValue(true),
    };

    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        PrismaService,
        WebhooksService,
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: WebhookReplayPreventionService,
          useValue: mockReplayPrevention,
        },
        {
          provide: 'BullQueue_webhooks',
          useValue: mockWebhookQueue,
        },
      ],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    webhooksService = module.get<WebhooksService>(WebhooksService);

    // 데이터베이스 연결
    try {
      await prismaService.onModuleInit();
      isDatabaseAvailable = true;

      // 테스트용 User 생성
      const user = await prismaService.write.user.create({
        data: {
          email: 'test-webhook@example.com',
          password_hash: 'test-hash',
          name: 'Test User for Webhooks',
        },
      });
      testUserId = user.id;

      // 테스트용 Business 생성
      const business = await prismaService.write.business.create({
        data: {
          name: 'Test Business for Webhooks',
          owner_id: testUserId,
          industry_type: IndustryType.OTHER,
        },
      });
      testBusinessId = business.id;

      // 테스트용 Channel 생성 (KAKAO)
      const kakaoChannel = await prismaService.write.channel.create({
        data: {
          business_id: testBusinessId,
          name: 'Test Kakao Channel',
          platform: 'KAKAO',
          platform_channel_id: 'test-kakao-channel-id',
          access_token: 'test-kakao-token',
        },
      });
      testChannelId = kakaoChannel.id;
    } catch (error) {
      console.warn(
        'Database connection failed, skipping integration tests. Set TEST_DATABASE_URL to run integration tests.',
        error
      );
      prismaService = null;
      webhooksService = null;
      isDatabaseAvailable = false;
    }
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    if (prismaService && isDatabaseAvailable) {
      try {
        // Inquiry 삭제
        if (testCustomerId) {
          await prismaService.write.inquiry.deleteMany({
            where: { customer_id: testCustomerId },
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

  describe('Kakao Webhook Flow', () => {
    it('should create inquiry from Kakao webhook', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !webhooksService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const kakaoPayload: KakaoWebhookDto = {
        user: {
          id: 'kakao-user-123',
          type: 'user',
          properties: {
            nickname: 'Test Kakao User',
          },
        },
        type: 'text',
        content: {
          text: 'Hello, this is a test message from Kakao!',
        },
        user_key: 'kakao-user-123',
      };

      // Act
      const result = await webhooksService.handleKakaoWebhook(testChannelId, kakaoPayload);

      // Assert
      expect(result.success).toBe(true);
      expect(result.inquiry_id).toBeDefined();
      expect(result.customer_id).toBeDefined();

      // Verify inquiry was created
      const inquiry = await prismaService.read.inquiry.findUnique({
        where: { id: result.inquiry_id },
      });

      expect(inquiry).toBeDefined();
      expect(inquiry?.message_text).toBe('Hello, this is a test message from Kakao!');
      expect(inquiry?.status).toBe('NEW');
      expect(inquiry?.channel_id).toBe(testChannelId);
      expect(inquiry?.business_id).toBe(testBusinessId);

      // Store customer ID for cleanup
      if (result.customer_id) {
        testCustomerId = result.customer_id;
      }
    });

    it('should create new customer if not exists', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !webhooksService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const newUserId = `kakao-user-${Date.now()}`;
      const kakaoPayload: KakaoWebhookDto = {
        user: {
          id: newUserId,
          type: 'user',
          properties: {
            nickname: 'New Kakao User',
          },
        },
        type: 'text',
        content: {
          text: 'Message from new customer',
        },
        user_key: newUserId,
      };

      // Act
      const result = await webhooksService.handleKakaoWebhook(testChannelId, kakaoPayload);

      // Assert
      expect(result.success).toBe(true);
      expect(result.customer_id).toBeDefined();

      // Verify customer was created
      const customer = await prismaService.read.customer.findUnique({
        where: { id: result.customer_id },
      });

      expect(customer).toBeDefined();
      expect(customer?.platform_user_id).toBe(newUserId);
      expect(customer?.platform).toBe('KAKAO');
      expect(customer?.business_id).toBe(testBusinessId);
    });

    it('should update existing customer on new message', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !webhooksService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange - Create customer first
      const userId = `kakao-user-update-${Date.now()}`;
      const customer = await prismaService.write.customer.create({
        data: {
          business_id: testBusinessId,
          platform_user_id: userId,
          platform: 'KAKAO',
          name: 'Existing Customer',
          first_contact: new Date(),
          last_contact: new Date(),
          inquiry_count: 0,
        },
      });

      const initialInquiryCount = customer.inquiry_count;
      const initialLastContact = customer.last_contact;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      const kakaoPayload: KakaoWebhookDto = {
        user: {
          id: userId,
          type: 'user',
          properties: {
            nickname: 'Existing Customer',
          },
        },
        type: 'text',
        content: {
          text: 'Another message from existing customer',
        },
        user_key: userId,
      };

      // Act
      const result = await webhooksService.handleKakaoWebhook(testChannelId, kakaoPayload);

      // Assert
      expect(result.success).toBe(true);

      // Verify customer was updated
      const updatedCustomer = await prismaService.read.customer.findUnique({
        where: { id: customer.id },
      });

      expect(updatedCustomer).toBeDefined();
      expect(updatedCustomer?.inquiry_count).toBe(initialInquiryCount + 1);
      if (initialLastContact && updatedCustomer?.last_contact) {
        expect(updatedCustomer.last_contact.getTime()).toBeGreaterThan(
          initialLastContact.getTime()
        );
      }
    });

    it('should handle Kakao webhook with string content', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !webhooksService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const userId = `kakao-user-string-${Date.now()}`;
      const kakaoPayload = {
        user: {
          id: userId,
          type: 'user',
          properties: {
            nickname: 'String Content User',
          },
        },
        type: 'text',
        content: 'Direct string content',
        user_key: userId,
      } as unknown as KakaoWebhookDto;

      // Act
      const result = await webhooksService.handleKakaoWebhook(testChannelId, kakaoPayload);

      // Assert
      expect(result.success).toBe(true);

      // Verify inquiry was created with string content
      const inquiry = await prismaService.read.inquiry.findUnique({
        where: { id: result.inquiry_id },
      });

      expect(inquiry?.message_text).toBe('Direct string content');
    });

    it('should reject unsupported message types', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !webhooksService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const kakaoPayload: KakaoWebhookDto = {
        user: {
          id: 'kakao-user-unsupported',
          type: 'user',
          properties: {},
        },
        type: 'image', // Unsupported type
        content: {
          text: 'This should be ignored',
        },
        user_key: 'kakao-user-unsupported',
      };

      // Act
      const result = await webhooksService.handleKakaoWebhook(testChannelId, kakaoPayload);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Message type not supported');
      expect(result.inquiry_id).toBeUndefined();
    });

    it('should throw error for non-existent channel', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !webhooksService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const kakaoPayload: KakaoWebhookDto = {
        user: {
          id: 'kakao-user-123',
          type: 'user',
          properties: {},
        },
        type: 'text',
        content: {
          text: 'Test message',
        },
        user_key: 'kakao-user-123',
      };

      // Act & Assert
      await expect(
        webhooksService.handleKakaoWebhook('non-existent-channel', kakaoPayload)
      ).rejects.toThrow();
    });
  });

  describe('LINE Webhook Flow', () => {
    let lineChannelId: string;

    beforeAll(async () => {
      if (isDatabaseAvailable && prismaService) {
        // Create LINE channel for LINE tests
        const lineChannel = await prismaService.write.channel.create({
          data: {
            business_id: testBusinessId,
            name: 'Test LINE Channel',
            platform: 'LINE',
            platform_channel_id: 'test-line-channel-id',
            access_token: 'test-line-token',
          },
        });
        lineChannelId = lineChannel.id;
      }
    });

    afterAll(async () => {
      if (isDatabaseAvailable && prismaService && lineChannelId) {
        try {
          await prismaService.write.channel.deleteMany({
            where: { id: lineChannelId },
          });
        } catch (error) {
          console.warn('LINE channel cleanup error:', error);
        }
      }
    });

    it('should create inquiry from LINE webhook', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !webhooksService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const linePayload: LineWebhookDto = {
        destination: lineChannelId,
        events: [
          {
            type: 'message',
            message: {
              id: `line-msg-${Date.now()}`,
              type: 'text',
              text: 'Hello, this is a test message from LINE!',
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
            source: {
              type: 'user',
              userId: 'line-user-123',
            },
            replyToken: 'reply-token-123',
            mode: 'active',
          },
        ],
      };

      // Act
      const result = await webhooksService.handleLineWebhook(lineChannelId, linePayload);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.inquiry_id).toBeDefined();
      expect(result.results[0]?.customer_id).toBeDefined();
      expect(result.results[0]?.reply_token).toBe('reply-token-123');

      // Verify inquiry was created
      const inquiry = await prismaService.read.inquiry.findUnique({
        where: { id: result.results[0]?.inquiry_id },
      });

      expect(inquiry).toBeDefined();
      expect(inquiry?.message_text).toBe('Hello, this is a test message from LINE!');
      expect(inquiry?.status).toBe('NEW');
      expect(inquiry?.channel_id).toBe(lineChannelId);
      expect(inquiry?.business_id).toBe(testBusinessId);
    });

    it('should process multiple LINE events', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !webhooksService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const timestamp = Date.now();
      const linePayload: LineWebhookDto = {
        destination: lineChannelId,
        events: [
          {
            type: 'message',
            message: {
              id: `line-msg-1-${timestamp}`,
              type: 'text',
              text: 'First message',
              timestamp,
            },
            timestamp,
            source: {
              type: 'user',
              userId: `line-user-multi-${timestamp}`,
            },
            replyToken: 'reply-token-1',
            mode: 'active',
          },
          {
            type: 'message',
            message: {
              id: `line-msg-2-${timestamp}`,
              type: 'text',
              text: 'Second message',
              timestamp: timestamp + 1000,
            },
            timestamp: timestamp + 1000,
            source: {
              type: 'user',
              userId: `line-user-multi-${timestamp}`,
            },
            replyToken: 'reply-token-2',
            mode: 'active',
          },
        ],
      };

      // Act
      const result = await webhooksService.handleLineWebhook(lineChannelId, linePayload);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    it('should create new customer for LINE webhook', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !webhooksService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const newUserId = `line-user-${Date.now()}`;
      const linePayload: LineWebhookDto = {
        destination: lineChannelId,
        events: [
          {
            type: 'message',
            message: {
              id: `line-msg-new-${Date.now()}`,
              type: 'text',
              text: 'Message from new LINE customer',
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
            source: {
              type: 'user',
              userId: newUserId,
            },
            replyToken: 'reply-token-new',
            mode: 'active',
          },
        ],
      };

      // Act
      const result = await webhooksService.handleLineWebhook(lineChannelId, linePayload);

      // Assert
      expect(result.success).toBe(true);
      expect(result.results[0]?.customer_id).toBeDefined();

      // Verify customer was created
      const customer = await prismaService.read.customer.findUnique({
        where: { id: result.results[0]?.customer_id },
      });

      expect(customer).toBeDefined();
      expect(customer?.platform_user_id).toBe(newUserId);
      expect(customer?.platform).toBe('LINE');
      expect(customer?.business_id).toBe(testBusinessId);
    });

    it('should skip non-text messages', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !webhooksService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const linePayload: LineWebhookDto = {
        destination: lineChannelId,
        events: [
          {
            type: 'message',
            message: {
              id: `line-msg-image-${Date.now()}`,
              type: 'image', // Non-text message
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
            source: {
              type: 'user',
              userId: 'line-user-image',
            },
            replyToken: 'reply-token-image',
            mode: 'active',
          },
        ],
      };

      // Act
      const result = await webhooksService.handleLineWebhook(lineChannelId, linePayload);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processed).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should throw error for non-existent LINE channel', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !webhooksService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const linePayload: LineWebhookDto = {
        destination: 'non-existent-channel',
        events: [
          {
            type: 'message',
            message: {
              id: 'line-msg-123',
              type: 'text',
              text: 'Test message',
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
            source: {
              type: 'user',
              userId: 'line-user-123',
            },
            replyToken: 'reply-token-123',
            mode: 'active',
          },
        ],
      };

      // Act & Assert
      await expect(
        webhooksService.handleLineWebhook('non-existent-channel', linePayload)
      ).rejects.toThrow();
    });
  });

  describe('Replay Prevention', () => {
    it('should prevent duplicate Kakao webhook events', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !webhooksService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const replayPrevention = module.get<WebhookReplayPreventionService>(
        WebhookReplayPreventionService
      );
      const userId = `kakao-user-replay-${Date.now()}`;
      const kakaoPayload: KakaoWebhookDto = {
        user: {
          id: userId,
          type: 'user',
          properties: {},
        },
        type: 'text',
        content: {
          text: 'First message',
        },
        user_key: userId,
      };

      // First webhook - should succeed
      const firstResult = await webhooksService.handleKakaoWebhook(testChannelId, kakaoPayload);
      expect(firstResult.success).toBe(true);

      // Mark as duplicate
      jest.spyOn(replayPrevention, 'isDuplicate').mockResolvedValueOnce(true);

      // Second webhook with same event - should be rejected
      await expect(webhooksService.handleKakaoWebhook(testChannelId, kakaoPayload)).rejects.toThrow(
        'Duplicate webhook event'
      );
    });
  });
});
