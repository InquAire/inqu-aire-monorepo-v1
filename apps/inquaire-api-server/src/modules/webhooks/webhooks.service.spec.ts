/**
 * WebhooksService Unit Tests
 *
 * 테스트 범위:
 * - Kakao 웹훅 처리 (handleKakaoWebhook)
 * - LINE 웹훅 처리 (handleLineWebhook)
 * - 웹훅 서명 검증 (verifyKakaoSignature, verifyLineSignature)
 * - 중복 방지 (idempotency)
 * - 재시도 로직 (retryWebhook)
 * - 메시지 전송 (sendKakaoMessage, sendLineMessage)
 * - 에러 핸들링 (네트워크, 파싱 등)
 */

import * as crypto from 'crypto';

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { Job, Queue } from 'bullmq';

import { KakaoWebhookDto } from './dto/kakao-webhook.dto';
import { LineWebhookDto } from './dto/line-webhook.dto';
import { WebhookReplayPreventionService } from './services/webhook-replay-prevention.service';
import { WebhooksService } from './webhooks.service';

import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { MetricsService } from '@/common/modules/metrics/metrics.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prisma: {
    read: {
      channel: { findUnique: jest.Mock; findFirst: jest.Mock };
      customer: { findFirst: jest.Mock };
    };
    write: {
      inquiry: { create: jest.Mock };
      customer: { create: jest.Mock; update: jest.Mock };
      webhookEvent: { create: jest.Mock };
      errorLog: { create: jest.Mock };
    };
  };
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<CustomLoggerService>;
  let metricsService: jest.Mocked<MetricsService>;
  let replayPrevention: jest.Mocked<WebhookReplayPreventionService>;
  let webhookQueue: jest.Mocked<Queue>;

  // Test data
  const mockChannel = {
    id: 'channel-123',
    business_id: 'business-123',
    name: 'Test Channel',
    platform: 'KAKAO',
    access_token: 'test-access-token',
    deleted_at: null,
    business: {
      id: 'business-123',
      name: 'Test Business',
    },
  };

  const mockCustomer = {
    id: 'customer-123',
    business_id: 'business-123',
    platform_user_id: 'user-123',
    platform: 'KAKAO',
    name: 'Test Customer',
    first_contact: new Date(),
    last_contact: new Date(),
    inquiry_count: 0,
    deleted_at: null,
  };

  const mockInquiry = {
    id: 'inquiry-123',
    business_id: 'business-123',
    channel_id: 'channel-123',
    customer_id: 'customer-123',
    platform_message_id: 'msg-123',
    message_text: 'Test message',
    status: 'NEW',
    received_at: new Date(),
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
          findFirst: jest.fn(),
        },
      },
      write: {
        inquiry: {
          create: jest.fn(),
        },
        customer: {
          create: jest.fn(),
          update: jest.fn(),
        },
        webhookEvent: {
          create: jest.fn(),
        },
        errorLog: {
          create: jest.fn(),
        },
      },
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const mockMetricsService = {
      recordWebhookEvent: jest.fn(),
      recordInquiryCreated: jest.fn(),
    };

    const mockReplayPrevention = {
      isDuplicate: jest.fn(),
      isTimestampValid: jest.fn(),
    };

    const mockWebhookQueue = {
      add: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
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

    service = module.get<WebhooksService>(WebhooksService);
    prisma = module.get(PrismaService) as typeof prisma;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    logger = module.get(CustomLoggerService) as jest.Mocked<CustomLoggerService>;
    metricsService = module.get(MetricsService) as jest.Mocked<MetricsService>;
    replayPrevention = module.get(
      WebhookReplayPreventionService
    ) as jest.Mocked<WebhookReplayPreventionService>;
    webhookQueue = module.get('BullQueue_webhooks') as jest.Mocked<Queue>;

    // Compatibility layer: make findFirst point to findUnique for existing tests
    prisma.read.channel.findFirst = prisma.read.channel.findUnique;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleKakaoWebhook', () => {
    const channelId = 'channel-123';
    const kakaoPayload: KakaoWebhookDto = {
      user_key: 'user-123',
      type: 'text',
      content: {
        text: 'Test message',
      },
      user: {
        id: 'user-123',
        type: 'user',
        properties: {
          nickname: 'Test User',
        },
      },
    };

    it('should process Kakao webhook successfully', async () => {
      // Arrange
      prisma.read.channel.findUnique.mockResolvedValue(mockChannel);
      replayPrevention.isDuplicate.mockResolvedValue(false);
      prisma.read.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.write.customer.update.mockResolvedValue({
        ...mockCustomer,
        last_contact: new Date(),
        inquiry_count: 1,
      });
      prisma.write.inquiry.create.mockResolvedValue(mockInquiry);
      prisma.write.webhookEvent.create.mockResolvedValue({});

      // Act
      const result = await service.handleKakaoWebhook(channelId, kakaoPayload);

      // Assert
      expect(result.success).toBe(true);
      expect(result.inquiry_id).toBe('inquiry-123');
      expect(prisma.read.channel.findUnique).toHaveBeenCalledWith({
        where: { id: channelId },
        include: { business: true },
      });
      expect(replayPrevention.isDuplicate).toHaveBeenCalled();
      expect(prisma.write.inquiry.create).toHaveBeenCalled();
      expect(metricsService.recordWebhookEvent).toHaveBeenCalledWith(
        'KAKAO',
        'message_received',
        channelId
      );
      expect(metricsService.recordInquiryCreated).toHaveBeenCalledWith('KAKAO', 'business-123');
    });

    it('should throw NotFoundException when channel not found', async () => {
      // Arrange
      prisma.read.channel.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.handleKakaoWebhook(channelId, kakaoPayload)).rejects.toThrow(
        NotFoundException
      );
      expect(prisma.write.inquiry.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for duplicate webhook event', async () => {
      // Arrange
      prisma.read.channel.findUnique.mockResolvedValue(mockChannel);
      replayPrevention.isDuplicate.mockResolvedValue(true);

      // Act & Assert
      await expect(service.handleKakaoWebhook(channelId, kakaoPayload)).rejects.toThrow(
        BadRequestException
      );
      expect(prisma.write.inquiry.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when message text is empty', async () => {
      // Arrange
      const emptyPayload: KakaoWebhookDto = {
        ...kakaoPayload,
        content: {
          text: '',
        },
      };
      prisma.read.channel.findUnique.mockResolvedValue(mockChannel);
      replayPrevention.isDuplicate.mockResolvedValue(false);

      // Act & Assert
      await expect(service.handleKakaoWebhook(channelId, emptyPayload)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should return success for unsupported message type', async () => {
      // Arrange
      const unsupportedPayload: KakaoWebhookDto = {
        ...kakaoPayload,
        type: 'image',
      };
      prisma.read.channel.findUnique.mockResolvedValue(mockChannel);
      replayPrevention.isDuplicate.mockResolvedValue(false);

      // Act
      const result = await service.handleKakaoWebhook(channelId, unsupportedPayload);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Message type not supported');
      expect(prisma.write.inquiry.create).not.toHaveBeenCalled();
    });

    it('should create new customer if not exists', async () => {
      // Arrange
      prisma.read.channel.findUnique.mockResolvedValue(mockChannel);
      replayPrevention.isDuplicate.mockResolvedValue(false);
      prisma.read.customer.findFirst.mockResolvedValue(null);
      prisma.write.customer.create.mockResolvedValue(mockCustomer);
      prisma.write.inquiry.create.mockResolvedValue(mockInquiry);
      prisma.write.webhookEvent.create.mockResolvedValue({});

      // Act
      await service.handleKakaoWebhook(channelId, kakaoPayload);

      // Assert
      expect(prisma.write.customer.create).toHaveBeenCalled();
      expect(prisma.write.customer.update).not.toHaveBeenCalled();
    });

    it('should handle content as string', async () => {
      // Arrange
      const stringContentPayload = {
        ...kakaoPayload,
        content: 'Direct string content',
      } as unknown as KakaoWebhookDto;
      prisma.read.channel.findUnique.mockResolvedValue(mockChannel);
      replayPrevention.isDuplicate.mockResolvedValue(false);
      prisma.read.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.write.customer.update.mockResolvedValue(mockCustomer);
      prisma.write.inquiry.create.mockResolvedValue(mockInquiry);
      prisma.write.webhookEvent.create.mockResolvedValue({});

      // Act
      await service.handleKakaoWebhook(channelId, stringContentPayload);

      // Assert
      expect(prisma.write.inquiry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            message_text: 'Direct string content',
          }),
        })
      );
    });
  });

  describe('handleLineWebhook', () => {
    const channelId = 'channel-123';
    const linePayload: LineWebhookDto = {
      destination: 'dest-123',
      events: [
        {
          type: 'message',
          message: {
            id: 'msg-123',
            type: 'text',
            text: 'Test LINE message',
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

    it('should process LINE webhook successfully', async () => {
      // Arrange
      prisma.read.channel.findUnique.mockResolvedValue(mockChannel);
      replayPrevention.isTimestampValid.mockReturnValue(true);
      replayPrevention.isDuplicate.mockResolvedValue(false);
      prisma.read.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.write.customer.update.mockResolvedValue(mockCustomer);
      prisma.write.inquiry.create.mockResolvedValue(mockInquiry);
      prisma.write.webhookEvent.create.mockResolvedValue({});

      // Act
      const result = await service.handleLineWebhook(channelId, linePayload);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(prisma.write.inquiry.create).toHaveBeenCalled();
      expect(metricsService.recordWebhookEvent).toHaveBeenCalledWith(
        'LINE',
        'message_received',
        channelId
      );
    });

    it('should skip events with invalid timestamp', async () => {
      // Arrange
      prisma.read.channel.findUnique.mockResolvedValue(mockChannel);
      replayPrevention.isTimestampValid.mockReturnValue(false);

      // Act
      const result = await service.handleLineWebhook(channelId, linePayload);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processed).toBe(0);
      expect(prisma.write.inquiry.create).not.toHaveBeenCalled();
    });

    it('should skip duplicate events', async () => {
      // Arrange
      prisma.read.channel.findUnique.mockResolvedValue(mockChannel);
      replayPrevention.isTimestampValid.mockReturnValue(true);
      replayPrevention.isDuplicate.mockResolvedValue(true);

      // Act
      const result = await service.handleLineWebhook(channelId, linePayload);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processed).toBe(0);
      expect(prisma.write.inquiry.create).not.toHaveBeenCalled();
    });

    it('should skip non-text messages', async () => {
      // Arrange
      const nonTextPayload: LineWebhookDto = {
        ...linePayload,
        events: [
          {
            ...linePayload.events[0],
            message: {
              id: 'msg-123',
              type: 'image',
              timestamp: Date.now(),
            },
          },
        ],
      };
      prisma.read.channel.findUnique.mockResolvedValue(mockChannel);
      replayPrevention.isTimestampValid.mockReturnValue(true);
      replayPrevention.isDuplicate.mockResolvedValue(false);

      // Act
      const result = await service.handleLineWebhook(channelId, nonTextPayload);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processed).toBe(0);
      expect(prisma.write.inquiry.create).not.toHaveBeenCalled();
    });

    it('should process multiple events', async () => {
      // Arrange
      const multiEventPayload: LineWebhookDto = {
        ...linePayload,
        events: [
          linePayload.events[0],
          {
            ...linePayload.events[0],
            message: {
              ...linePayload.events[0].message!,
              id: 'msg-456',
              text: 'Second message',
            },
            timestamp: Date.now(),
          },
        ],
      };
      prisma.read.channel.findUnique.mockResolvedValue(mockChannel);
      replayPrevention.isTimestampValid.mockReturnValue(true);
      replayPrevention.isDuplicate.mockResolvedValue(false);
      prisma.read.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.write.customer.update.mockResolvedValue(mockCustomer);
      prisma.write.inquiry.create
        .mockResolvedValueOnce(mockInquiry)
        .mockResolvedValueOnce({ ...mockInquiry, id: 'inquiry-456' });
      prisma.write.webhookEvent.create.mockResolvedValue({});

      // Act
      const result = await service.handleLineWebhook(channelId, multiEventPayload);

      // Assert
      expect(result.success).toBe(true);
      expect(result.processed).toBe(2);
      expect(prisma.write.inquiry.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyLineSignature', () => {
    const body = Buffer.from('test body');
    const channelSecret = 'test-secret';

    it('should verify valid LINE signature', () => {
      // Arrange
      const hash = crypto.createHmac('SHA256', channelSecret).update(body).digest('base64');
      configService.get.mockReturnValue(channelSecret);

      // Act
      const result = service.verifyLineSignature(body, hash);

      // Assert
      expect(result).toBe(true);
    });

    it('should reject invalid LINE signature', () => {
      // Arrange
      const invalidSignature = 'invalid-signature';
      configService.get.mockReturnValue(channelSecret);

      // Act
      const result = service.verifyLineSignature(body, invalidSignature);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when channel secret not configured', () => {
      // Arrange
      configService.get.mockReturnValue(undefined);

      // Act
      const result = service.verifyLineSignature(body, 'signature');

      // Assert
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should return false when signature header missing', () => {
      // Arrange
      configService.get.mockReturnValue(channelSecret);

      // Act
      const result = service.verifyLineSignature(body, '');

      // Assert
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('verifyKakaoSignature', () => {
    const body = Buffer.from('test body');
    const kakaoSecret = 'test-kakao-secret';

    it('should return true when secret not configured (IP whitelist only)', () => {
      // Arrange
      configService.get.mockReturnValue(undefined);

      // Act
      const result = service.verifyKakaoSignature(body);

      // Assert
      expect(result).toBe(true);
      expect(logger.log).toHaveBeenCalled();
    });

    it('should verify valid Kakao signature', () => {
      // Arrange
      const hash = crypto.createHmac('SHA256', kakaoSecret).update(body).digest('base64');
      configService.get.mockReturnValue(kakaoSecret);

      // Act
      const result = service.verifyKakaoSignature(body, hash);

      // Assert
      expect(result).toBe(true);
    });

    it('should reject invalid Kakao signature', () => {
      // Arrange
      const invalidSignature = 'invalid-signature';
      configService.get.mockReturnValue(kakaoSecret);

      // Act
      const result = service.verifyKakaoSignature(body, invalidSignature);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when signature header missing', () => {
      // Arrange
      configService.get.mockReturnValue(kakaoSecret);

      // Act
      const result = service.verifyKakaoSignature(body);

      // Assert
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('sendKakaoMessage', () => {
    const channelId = 'channel-123';
    const userKey = 'user-123';
    const message = 'Test message';

    it('should send Kakao message successfully', async () => {
      // Arrange
      prisma.read.channel.findUnique.mockResolvedValue(mockChannel);
      mockedAxios.post.mockResolvedValue({ data: { success: true } });

      // Act
      const result = await service.sendKakaoMessage(channelId, userKey, message);

      // Assert
      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://kapi.kakao.com/v1/api/talk/send',
        {
          receiver_key: userKey,
          message: {
            text: message,
          },
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `KakaoAK ${mockChannel.access_token}`,
          }),
        })
      );
    });

    it('should throw NotFoundException when channel not found', async () => {
      // Arrange
      prisma.read.channel.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.sendKakaoMessage(channelId, userKey, message)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException when access token not configured', async () => {
      // Arrange
      prisma.read.channel.findUnique.mockResolvedValue({
        ...mockChannel,
        access_token: null,
      });

      // Act & Assert
      await expect(service.sendKakaoMessage(channelId, userKey, message)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle axios errors', async () => {
      // Arrange
      prisma.read.channel.findUnique.mockResolvedValue(mockChannel);
      const error = new Error('Network error');
      mockedAxios.post.mockRejectedValue(error);

      // Act & Assert
      await expect(service.sendKakaoMessage(channelId, userKey, message)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('sendLineMessage', () => {
    const replyToken = 'reply-token-123';
    const message = 'Test LINE message';
    const accessToken = 'line-access-token';

    it('should send LINE message successfully', async () => {
      // Arrange
      configService.get.mockReturnValue(accessToken);
      mockedAxios.post.mockResolvedValue({ data: { success: true } });

      // Act
      const result = await service.sendLineMessage(replyToken, message);

      // Assert
      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/message/reply',
        {
          replyToken,
          messages: [
            {
              type: 'text',
              text: message,
            },
          ],
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${accessToken}`,
          }),
        })
      );
    });

    it('should throw BadRequestException when access token not configured', async () => {
      // Arrange
      configService.get.mockReturnValue(undefined);

      // Act & Assert
      await expect(service.sendLineMessage(replyToken, message)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle axios errors', async () => {
      // Arrange
      configService.get.mockReturnValue(accessToken);
      const error = new Error('Network error');
      mockedAxios.post.mockRejectedValue(error);

      // Act & Assert
      await expect(service.sendLineMessage(replyToken, message)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('retryWebhook', () => {
    const channelId = 'channel-123';
    const platform = 'KAKAO' as const;
    const payload: KakaoWebhookDto = {
      user_key: 'user-123',
      type: 'text',
      content: {
        text: 'Test message',
      },
      user: {
        id: 'user-123',
        type: 'user',
        properties: {},
      },
    };

    it('should queue webhook retry with correct delay', async () => {
      // Arrange
      const mockJob = { id: 'job-123' } as Job;
      webhookQueue.add.mockResolvedValue(mockJob);

      // Act
      await service.retryWebhook(channelId, platform, payload, 1);

      // Assert
      expect(webhookQueue.add).toHaveBeenCalledWith(
        'process-webhook',
        {
          channelId,
          platform,
          payload,
          attemptNumber: 1,
        },
        expect.objectContaining({
          delay: 60 * 1000, // 1 minute
          attempts: 1,
        })
      );
    });

    it('should use exponential backoff for retries', async () => {
      // Arrange
      const mockJob = { id: 'job-123' } as Job;
      webhookQueue.add.mockResolvedValue(mockJob);

      // Act
      await service.retryWebhook(channelId, platform, payload, 2);

      // Assert
      expect(webhookQueue.add).toHaveBeenCalledWith(
        'process-webhook',
        expect.any(Object),
        expect.objectContaining({
          delay: 5 * 60 * 1000, // 5 minutes
        })
      );
    });

    it('should not retry if attempt number exceeds limit', async () => {
      // Arrange

      // Act
      await service.retryWebhook(channelId, platform, payload, 4);

      // Assert
      expect(webhookQueue.add).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
