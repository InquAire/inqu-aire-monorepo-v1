/**
 * WebhooksController Unit Tests
 *
 * 테스트 범위:
 * - Kakao 웹훅 엔드포인트
 * - LINE 웹훅 엔드포인트
 * - 웹훅 검증 통합
 * - 시그니처 검증 (LINE)
 * - 에러 핸들링
 * - 로깅
 */

import { BadRequestException } from '@nestjs/common';

import { KakaoWebhookDto } from './dto/kakao-webhook.dto';
import { LineWebhookDto } from './dto/line-webhook.dto';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { RawBodyRequest } from '@/common/types/raw-body-request.interface';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let webhooksService: jest.Mocked<WebhooksService>;
  let logger: jest.Mocked<CustomLoggerService>;

  const mockKakaoPayload: KakaoWebhookDto = {
    user: {
      id: 'user-123',
      type: 'user',
      properties: {
        nickname: 'Test User',
      },
    },
    type: 'text',
    content: {
      text: 'Hello, Kakao!',
    },
  };

  const mockLinePayload: LineWebhookDto = {
    destination: 'channel-123',
    events: [
      {
        type: 'message',
        message: {
          id: 'msg-123',
          type: 'text',
          text: 'Hello, LINE!',
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
        source: {
          type: 'user',
          userId: 'user-123',
        },
        replyToken: 'reply-token-123',
        mode: 'active',
      },
    ],
  };

  beforeEach(async () => {
    const mockWebhooksService = {
      handleKakaoWebhook: jest.fn(),
      handleLineWebhook: jest.fn(),
      verifyLineSignature: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    // Direct instantiation to avoid decorator dependency issues
    controller = new WebhooksController(
      mockWebhooksService as unknown as WebhooksService,
      mockLogger as unknown as CustomLoggerService
    );
    webhooksService = mockWebhooksService as unknown as jest.Mocked<WebhooksService>;
    logger = mockLogger as unknown as jest.Mocked<CustomLoggerService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleKakaoWebhook', () => {
    const channelId = 'channel-123';

    it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(controller.handleKakaoWebhook).toBeDefined();
    });

    it('should successfully handle Kakao webhook', async () => {
      // Arrange
      const expectedResult = {
        success: true,
        inquiry_id: 'inquiry-123',
        customer_id: 'customer-123',
      };
      webhooksService.handleKakaoWebhook.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.handleKakaoWebhook(channelId, mockKakaoPayload);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(webhooksService.handleKakaoWebhook).toHaveBeenCalledWith(channelId, mockKakaoPayload);
      expect(webhooksService.handleKakaoWebhook).toHaveBeenCalledTimes(1);
      expect(logger.log).toHaveBeenCalledWith(`Kakao webhook received for channel: ${channelId}`);
    });

    it('should log webhook reception', async () => {
      // Arrange
      webhooksService.handleKakaoWebhook.mockResolvedValue({
        success: true,
        inquiry_id: 'inquiry-123',
        customer_id: 'customer-123',
      });

      // Act
      await controller.handleKakaoWebhook(channelId, mockKakaoPayload);

      // Assert
      expect(logger.log).toHaveBeenCalledWith(`Kakao webhook received for channel: ${channelId}`);
    });

    it('should pass payload to service correctly', async () => {
      // Arrange
      const customPayload: KakaoWebhookDto = {
        user: {
          id: 'user-456',
          type: 'user',
          properties: {
            nickname: 'Another User',
            profile_image: 'https://example.com/image.jpg',
          },
        },
        type: 'photo',
        content: {
          text: 'Photo message',
          photo: {
            url: 'https://example.com/photo.jpg',
          },
        },
        user_key: 'user-key-456',
      };
      webhooksService.handleKakaoWebhook.mockResolvedValue({
        success: true,
        inquiry_id: 'inquiry-123',
        customer_id: 'customer-123',
      });

      // Act
      await controller.handleKakaoWebhook(channelId, customPayload);

      // Assert
      expect(webhooksService.handleKakaoWebhook).toHaveBeenCalledWith(channelId, customPayload);
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new BadRequestException('Invalid channel');
      webhooksService.handleKakaoWebhook.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.handleKakaoWebhook(channelId, mockKakaoPayload)).rejects.toThrow(
        BadRequestException
      );
      expect(webhooksService.handleKakaoWebhook).toHaveBeenCalled();
    });

    it('should handle different channel IDs', async () => {
      // Arrange
      const channelIds = ['channel-1', 'channel-2', 'channel-3'];
      webhooksService.handleKakaoWebhook.mockResolvedValue({
        success: true,
        inquiry_id: 'inquiry-123',
        customer_id: 'customer-123',
      });

      // Act
      for (const id of channelIds) {
        await controller.handleKakaoWebhook(id, mockKakaoPayload);
      }

      // Assert
      expect(webhooksService.handleKakaoWebhook).toHaveBeenCalledTimes(3);
      expect(webhooksService.handleKakaoWebhook).toHaveBeenCalledWith(
        'channel-1',
        mockKakaoPayload
      );
      expect(webhooksService.handleKakaoWebhook).toHaveBeenCalledWith(
        'channel-2',
        mockKakaoPayload
      );
      expect(webhooksService.handleKakaoWebhook).toHaveBeenCalledWith(
        'channel-3',
        mockKakaoPayload
      );
    });
  });

  describe('handleLineWebhook', () => {
    const channelId = 'channel-123';
    const validSignature = 'valid-signature-hash';

    it('should be defined', () => {
      expect(controller.handleLineWebhook).toBeDefined();
    });

    it('should successfully handle LINE webhook with valid signature', async () => {
      // Arrange
      const expectedResult = {
        success: true,
        processed: 1,
        results: [
          {
            inquiry_id: 'inquiry-123',
            customer_id: 'customer-123',
            reply_token: 'reply-token-123',
          },
        ],
      };
      const mockRequest: RawBodyRequest = {
        rawBody: Buffer.from(JSON.stringify(mockLinePayload)),
      } as RawBodyRequest;
      webhooksService.verifyLineSignature.mockReturnValue(true);
      webhooksService.handleLineWebhook.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.handleLineWebhook(
        channelId,
        validSignature,
        mockLinePayload,
        mockRequest
      );

      // Assert
      expect(result).toEqual(expectedResult);
      expect(webhooksService.verifyLineSignature).toHaveBeenCalledWith(
        mockRequest.rawBody,
        validSignature
      );
      expect(webhooksService.handleLineWebhook).toHaveBeenCalledWith(channelId, mockLinePayload);
      expect(logger.log).toHaveBeenCalledWith(`LINE webhook received for channel: ${channelId}`);
    });

    it('should verify LINE signature before processing', async () => {
      // Arrange
      const mockRequest: RawBodyRequest = {
        rawBody: Buffer.from(JSON.stringify(mockLinePayload)),
      } as RawBodyRequest;
      webhooksService.verifyLineSignature.mockReturnValue(true);
      webhooksService.handleLineWebhook.mockResolvedValue({
        success: true,
        processed: 1,
        results: [
          {
            inquiry_id: 'inquiry-123',
            customer_id: 'customer-123',
            reply_token: 'reply-token-123',
          },
        ],
      });

      // Act
      await controller.handleLineWebhook(channelId, validSignature, mockLinePayload, mockRequest);

      // Assert
      expect(webhooksService.verifyLineSignature).toHaveBeenCalledWith(
        mockRequest.rawBody,
        validSignature
      );
      expect(webhooksService.handleLineWebhook).toHaveBeenCalledWith(channelId, mockLinePayload);
      // Verify signature is called before handleLineWebhook by checking call order
      const verifyCallOrder = (webhooksService.verifyLineSignature as jest.Mock).mock
        .invocationCallOrder[0];
      const handleCallOrder = (webhooksService.handleLineWebhook as jest.Mock).mock
        .invocationCallOrder[0];
      expect(verifyCallOrder).toBeLessThan(handleCallOrder);
    });

    it('should throw BadRequestException when signature is invalid', async () => {
      // Arrange
      const invalidSignature = 'invalid-signature';
      const mockRequest: RawBodyRequest = {
        rawBody: Buffer.from(JSON.stringify(mockLinePayload)),
      } as RawBodyRequest;
      webhooksService.verifyLineSignature.mockReturnValue(false);

      // Act & Assert
      await expect(
        controller.handleLineWebhook(channelId, invalidSignature, mockLinePayload, mockRequest)
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.handleLineWebhook(channelId, invalidSignature, mockLinePayload, mockRequest)
      ).rejects.toThrow('Invalid signature');

      expect(webhooksService.verifyLineSignature).toHaveBeenCalledWith(
        mockRequest.rawBody,
        invalidSignature
      );
      expect(webhooksService.handleLineWebhook).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid LINE signature',
        'WebhooksController',
        expect.objectContaining({
          channelId,
          signatureProvided: true,
        })
      );
    });

    it('should log warning when signature is missing', async () => {
      // Arrange
      const emptySignature = '';
      const mockRequest: RawBodyRequest = {
        rawBody: Buffer.from(JSON.stringify(mockLinePayload)),
      } as RawBodyRequest;
      webhooksService.verifyLineSignature.mockReturnValue(false);

      // Act & Assert
      await expect(
        controller.handleLineWebhook(channelId, emptySignature, mockLinePayload, mockRequest)
      ).rejects.toThrow(BadRequestException);

      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid LINE signature',
        'WebhooksController',
        expect.objectContaining({
          channelId,
          signatureProvided: false,
        })
      );
    });

    it('should use raw body for signature verification', async () => {
      // Arrange
      const rawBodyContent = JSON.stringify(mockLinePayload);
      const mockRequest: RawBodyRequest = {
        rawBody: Buffer.from(rawBodyContent),
      } as RawBodyRequest;
      webhooksService.verifyLineSignature.mockReturnValue(true);
      webhooksService.handleLineWebhook.mockResolvedValue({
        success: true,
        processed: 1,
        results: [
          {
            inquiry_id: 'inquiry-123',
            customer_id: 'customer-123',
            reply_token: 'reply-token-123',
          },
        ],
      });

      // Act
      await controller.handleLineWebhook(channelId, validSignature, mockLinePayload, mockRequest);

      // Assert
      expect(webhooksService.verifyLineSignature).toHaveBeenCalledWith(
        Buffer.from(rawBodyContent),
        validSignature
      );
    });

    it('should log webhook reception', async () => {
      // Arrange
      const mockRequest: RawBodyRequest = {
        rawBody: Buffer.from(JSON.stringify(mockLinePayload)),
      } as RawBodyRequest;
      webhooksService.verifyLineSignature.mockReturnValue(true);
      webhooksService.handleLineWebhook.mockResolvedValue({
        success: true,
        processed: 1,
        results: [
          {
            inquiry_id: 'inquiry-123',
            customer_id: 'customer-123',
            reply_token: 'reply-token-123',
          },
        ],
      });

      // Act
      await controller.handleLineWebhook(channelId, validSignature, mockLinePayload, mockRequest);

      // Assert
      expect(logger.log).toHaveBeenCalledWith(`LINE webhook received for channel: ${channelId}`);
    });

    it('should pass payload to service after signature verification', async () => {
      // Arrange
      const customPayload: LineWebhookDto = {
        destination: 'channel-456',
        events: [
          {
            type: 'message',
            message: {
              id: 'msg-456',
              type: 'text',
              text: 'Custom message',
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
            source: {
              type: 'group',
              userId: 'user-456',
              groupId: 'group-123',
            },
            replyToken: 'reply-token-456',
            mode: 'standby',
          },
        ],
      };
      const mockRequest: RawBodyRequest = {
        rawBody: Buffer.from(JSON.stringify(customPayload)),
      } as RawBodyRequest;
      webhooksService.verifyLineSignature.mockReturnValue(true);
      webhooksService.handleLineWebhook.mockResolvedValue({
        success: true,
        processed: 1,
        results: [
          {
            inquiry_id: 'inquiry-123',
            customer_id: 'customer-123',
            reply_token: 'reply-token-123',
          },
        ],
      });

      // Act
      await controller.handleLineWebhook(channelId, validSignature, customPayload, mockRequest);

      // Assert
      expect(webhooksService.handleLineWebhook).toHaveBeenCalledWith(channelId, customPayload);
    });

    it('should handle service errors after signature verification', async () => {
      // Arrange
      const mockRequest: RawBodyRequest = {
        rawBody: Buffer.from(JSON.stringify(mockLinePayload)),
      } as RawBodyRequest;
      const error = new BadRequestException('Invalid payload');
      webhooksService.verifyLineSignature.mockReturnValue(true);
      webhooksService.handleLineWebhook.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.handleLineWebhook(channelId, validSignature, mockLinePayload, mockRequest)
      ).rejects.toThrow(BadRequestException);
      expect(webhooksService.verifyLineSignature).toHaveBeenCalled();
      expect(webhooksService.handleLineWebhook).toHaveBeenCalled();
    });

    it('should handle different channel IDs', async () => {
      // Arrange
      const channelIds = ['channel-1', 'channel-2', 'channel-3'];
      const mockRequest: RawBodyRequest = {
        rawBody: Buffer.from(JSON.stringify(mockLinePayload)),
      } as RawBodyRequest;
      webhooksService.verifyLineSignature.mockReturnValue(true);
      webhooksService.handleLineWebhook.mockResolvedValue({
        success: true,
        processed: 1,
        results: [
          {
            inquiry_id: 'inquiry-123',
            customer_id: 'customer-123',
            reply_token: 'reply-token-123',
          },
        ],
      });

      // Act
      for (const id of channelIds) {
        await controller.handleLineWebhook(id, validSignature, mockLinePayload, mockRequest);
      }

      // Assert
      expect(webhooksService.handleLineWebhook).toHaveBeenCalledTimes(3);
      expect(webhooksService.handleLineWebhook).toHaveBeenCalledWith('channel-1', mockLinePayload);
      expect(webhooksService.handleLineWebhook).toHaveBeenCalledWith('channel-2', mockLinePayload);
      expect(webhooksService.handleLineWebhook).toHaveBeenCalledWith('channel-3', mockLinePayload);
    });

    it('should handle multiple events in LINE payload', async () => {
      // Arrange
      const multiEventPayload: LineWebhookDto = {
        destination: 'channel-123',
        events: [
          {
            type: 'message',
            message: {
              id: 'msg-1',
              type: 'text',
              text: 'First message',
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
            source: {
              type: 'user',
              userId: 'user-1',
            },
            replyToken: 'reply-1',
            mode: 'active',
          },
          {
            type: 'message',
            message: {
              id: 'msg-2',
              type: 'text',
              text: 'Second message',
              timestamp: Date.now(),
            },
            timestamp: Date.now(),
            source: {
              type: 'user',
              userId: 'user-2',
            },
            replyToken: 'reply-2',
            mode: 'active',
          },
        ],
      };
      const mockRequest: RawBodyRequest = {
        rawBody: Buffer.from(JSON.stringify(multiEventPayload)),
      } as RawBodyRequest;
      webhooksService.verifyLineSignature.mockReturnValue(true);
      webhooksService.handleLineWebhook.mockResolvedValue({
        success: true,
        processed: 1,
        results: [
          {
            inquiry_id: 'inquiry-123',
            customer_id: 'customer-123',
            reply_token: 'reply-token-123',
          },
        ],
      });

      // Act
      await controller.handleLineWebhook(channelId, validSignature, multiEventPayload, mockRequest);

      // Assert
      expect(webhooksService.handleLineWebhook).toHaveBeenCalledWith(channelId, multiEventPayload);
    });
  });

  describe('Error Handling', () => {
    const channelId = 'channel-123';

    it('should handle Kakao webhook service errors gracefully', async () => {
      // Arrange
      const error = new Error('Service error');
      webhooksService.handleKakaoWebhook.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.handleKakaoWebhook(channelId, mockKakaoPayload)).rejects.toThrow(
        'Service error'
      );
    });

    it('should handle LINE webhook service errors after signature verification', async () => {
      // Arrange
      const mockRequest: RawBodyRequest = {
        rawBody: Buffer.from(JSON.stringify(mockLinePayload)),
      } as RawBodyRequest;
      const error = new Error('Service error');
      webhooksService.verifyLineSignature.mockReturnValue(true);
      webhooksService.handleLineWebhook.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.handleLineWebhook(channelId, 'valid-signature', mockLinePayload, mockRequest)
      ).rejects.toThrow('Service error');
    });

    it('should not process LINE webhook when signature verification fails', async () => {
      // Arrange
      const mockRequest: RawBodyRequest = {
        rawBody: Buffer.from(JSON.stringify(mockLinePayload)),
      } as RawBodyRequest;
      webhooksService.verifyLineSignature.mockReturnValue(false);

      // Act & Assert
      await expect(
        controller.handleLineWebhook(channelId, 'invalid', mockLinePayload, mockRequest)
      ).rejects.toThrow(BadRequestException);

      expect(webhooksService.handleLineWebhook).not.toHaveBeenCalled();
    });
  });

  describe('Integration with Service', () => {
    const channelId = 'channel-123';

    it('should correctly pass all parameters to Kakao service', async () => {
      // Arrange
      webhooksService.handleKakaoWebhook.mockResolvedValue({
        success: true,
        inquiry_id: 'inquiry-123',
        customer_id: 'customer-123',
      });

      // Act
      await controller.handleKakaoWebhook(channelId, mockKakaoPayload);

      // Assert
      expect(webhooksService.handleKakaoWebhook).toHaveBeenCalledWith(
        channelId,
        expect.objectContaining({
          user: expect.objectContaining({
            id: 'user-123',
          }),
          type: 'text',
          content: expect.objectContaining({
            text: 'Hello, Kakao!',
          }),
        })
      );
    });

    it('should correctly pass all parameters to LINE service after verification', async () => {
      // Arrange
      const mockRequest: RawBodyRequest = {
        rawBody: Buffer.from(JSON.stringify(mockLinePayload)),
      } as RawBodyRequest;
      webhooksService.verifyLineSignature.mockReturnValue(true);
      webhooksService.handleLineWebhook.mockResolvedValue({
        success: true,
        processed: 1,
        results: [
          {
            inquiry_id: 'inquiry-123',
            customer_id: 'customer-123',
            reply_token: 'reply-token-123',
          },
        ],
      });

      // Act
      await controller.handleLineWebhook(channelId, 'signature', mockLinePayload, mockRequest);

      // Assert
      expect(webhooksService.handleLineWebhook).toHaveBeenCalledWith(
        channelId,
        expect.objectContaining({
          destination: 'channel-123',
          events: expect.arrayContaining([
            expect.objectContaining({
              type: 'message',
              message: expect.objectContaining({
                text: 'Hello, LINE!',
              }),
            }),
          ]),
        })
      );
    });
  });
});
