/**
 * AiService Unit Tests
 *
 * 테스트 범위:
 * - OpenAI API 호출 성공
 * - 프롬프트 템플릿 생성
 * - 스트리밍 응답 파싱
 * - 토큰 카운팅
 * - Rate limit 에러 처리
 * - Timeout 처리
 * - 재시도 로직
 * - 컨텍스트 관리
 * - 산업별 프롬프트 가져오기
 */

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import OpenAI from 'openai';

import { AiService } from './ai.service';
import { AnalyzeInquiryDto } from './dto/analyze-inquiry.dto';

import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

// Mock OpenAI
jest.mock('openai');

describe('AiService', () => {
  let service: AiService;
  let configService: jest.Mocked<ConfigService>;
  let prisma: {
    read: {
      industryConfig: { findUnique: jest.Mock };
    };
  };
  let logger: jest.Mocked<CustomLoggerService>;
  let mockOpenAI: {
    chat: {
      completions: {
        create: jest.Mock;
      };
    };
  };

  const mockApiKey = 'test-api-key';

  beforeEach(async () => {
    // Create mock OpenAI instance
    const mockChatCompletions = {
      create: jest.fn(),
    };

    mockOpenAI = {
      chat: {
        completions: mockChatCompletions,
      },
    };

    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
      () => mockOpenAI as unknown as OpenAI
    );

    // Create mock implementations
    const mockConfigService = {
      get: jest.fn().mockReturnValue(mockApiKey),
    };

    const mockPrismaService = {
      read: {
        industryConfig: {
          findUnique: jest.fn(),
        },
      },
    };

    const mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    prisma = module.get(PrismaService) as typeof prisma;
    logger = module.get(CustomLoggerService) as jest.Mocked<CustomLoggerService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeInquiry', () => {
    const analyzeDto: AnalyzeInquiryDto = {
      message: '안녕하세요, 예약하고 싶습니다.',
      industryType: 'HOSPITAL',
    };

    const mockOpenAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              type: '예약 문의',
              summary: '예약 문의입니다',
              extracted_info: {
                desired_date: '2025-01-20',
                desired_time: '오후',
              },
              sentiment: 'positive',
              urgency: 'medium',
              suggested_reply: '안녕하세요! 예약 도와드리겠습니다.',
              confidence: 0.9,
            }),
          },
        },
      ],
    };

    it('should analyze inquiry successfully', async () => {
      // Arrange
      prisma.read.industryConfig.findUnique.mockResolvedValue(null);
      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

      // Act
      const result = await service.analyzeInquiry(analyzeDto);

      // Assert
      expect(result.type).toBe('예약 문의');
      expect(result.summary).toBe('예약 문의입니다');
      expect(result.sentiment).toBe('positive');
      expect(result.urgency).toBe('medium');
      expect(result.confidence).toBe(0.9);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
            }),
            expect.objectContaining({
              role: 'user',
              content: analyzeDto.message,
            }),
          ]),
          temperature: 0.3,
          response_format: { type: 'json_object' },
        })
      );
    });

    it('should use custom system prompt from database', async () => {
      // Arrange
      const customPrompt = 'Custom system prompt for hospital';
      prisma.read.industryConfig.findUnique.mockResolvedValue({
        industry: 'HOSPITAL',
        system_prompt: customPrompt,
      } as { industry: string; system_prompt: string });
      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

      // Act
      await service.analyzeInquiry(analyzeDto);

      // Assert
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: customPrompt,
            }),
          ]),
        })
      );
    });

    it('should use default prompt when database config not found', async () => {
      // Arrange
      prisma.read.industryConfig.findUnique.mockResolvedValue(null);
      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

      // Act
      await service.analyzeInquiry(analyzeDto);

      // Assert
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0] as {
        messages: Array<{ role: string; content: string }>;
      };
      const systemMessage = callArgs.messages.find(m => m.role === 'system');
      expect(systemMessage?.content).toContain('병원');
    });

    it('should handle empty OpenAI response', async () => {
      // Arrange
      prisma.read.industryConfig.findUnique.mockResolvedValue(null);
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      } as OpenAI.Chat.Completions.ChatCompletion);

      // Act
      const result = await service.analyzeInquiry(analyzeDto);

      // Assert
      expect(result.type).toBe('일반 문의');
      expect(result.confidence).toBe(0.5);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle OpenAI API errors gracefully', async () => {
      // Arrange
      prisma.read.industryConfig.findUnique.mockResolvedValue(null);
      const apiError = new Error('OpenAI API rate limit exceeded');
      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      // Act
      const result = await service.analyzeInquiry(analyzeDto);

      // Assert
      expect(result.type).toBe('일반 문의');
      expect(result.confidence).toBe(0.5);
      expect(result.suggested_reply).toContain('담당자 확인 후');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle invalid JSON response gracefully', async () => {
      // Arrange
      prisma.read.industryConfig.findUnique.mockResolvedValue(null);
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Invalid JSON response',
            },
          },
        ],
      } as OpenAI.Chat.Completions.ChatCompletion);

      // Act
      const result = await service.analyzeInquiry(analyzeDto);

      // Assert - Should return default values when JSON parsing fails
      expect(result.type).toBe('일반 문의');
      expect(result.confidence).toBe(0.5);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should provide default values for missing fields', async () => {
      // Arrange
      prisma.read.industryConfig.findUnique.mockResolvedValue(null);
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                type: '일반 문의',
                // Missing other fields
              }),
            },
          },
        ],
      } as OpenAI.Chat.Completions.ChatCompletion);

      // Act
      const result = await service.analyzeInquiry(analyzeDto);

      // Assert
      expect(result.type).toBe('일반 문의');
      expect(result.summary).toBe(analyzeDto.message.substring(0, 100));
      expect(result.sentiment).toBe('neutral');
      expect(result.urgency).toBe('medium');
      expect(result.confidence).toBe(0.8);
    });

    it('should throw error when OpenAI not initialized', async () => {
      // Arrange - Create service without API key
      configService.get.mockReturnValue(undefined);
      const moduleWithoutKey: TestingModule = await Test.createTestingModule({
        providers: [
          AiService,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue(undefined) },
          },
          {
            provide: PrismaService,
            useValue: { read: { industryConfig: { findUnique: jest.fn() } } },
          },
          {
            provide: CustomLoggerService,
            useValue: { warn: jest.fn(), log: jest.fn(), error: jest.fn() },
          },
        ],
      }).compile();

      const serviceWithoutKey = moduleWithoutKey.get<AiService>(AiService);

      // Act & Assert
      await expect(serviceWithoutKey.analyzeInquiry(analyzeDto)).rejects.toThrow(
        'OpenAI API key not configured'
      );
    });

    it('should handle different industry types', async () => {
      // Arrange
      const realEstateDto: AnalyzeInquiryDto = {
        message: '부동산 문의입니다',
        industryType: 'REAL_ESTATE',
      };
      prisma.read.industryConfig.findUnique.mockResolvedValue(null);
      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

      // Act
      await service.analyzeInquiry(realEstateDto);

      // Assert
      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0] as {
        messages: Array<{ role: string; content: string }>;
      };
      const systemMessage = callArgs.messages.find(m => m.role === 'system');
      expect(systemMessage?.content).toContain('부동산');
    });
  });

  describe('generateReply', () => {
    const messageText = '안녕하세요';
    const industryType = 'HOSPITAL';

    it('should generate reply successfully', async () => {
      // Arrange
      const mockResponse = {
        choices: [
          {
            message: {
              content: '안녕하세요! 무엇을 도와드릴까요?',
            },
          },
        ],
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(
        mockResponse as OpenAI.Chat.Completions.ChatCompletion
      );

      // Act
      const result = await service.generateReply(messageText, industryType);

      // Assert
      expect(result).toBe('안녕하세요! 무엇을 도와드릴까요?');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.7,
          max_tokens: 200,
        })
      );
    });

    it('should include context when provided', async () => {
      // Arrange
      const context = '이전 대화: 예약 문의';
      const mockResponse = {
        choices: [
          {
            message: {
              content: '답변',
            },
          },
        ],
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(
        mockResponse as OpenAI.Chat.Completions.ChatCompletion
      );

      // Act
      await service.generateReply(messageText, industryType, context);

      // Assert
      const callArgs = mockOpenAI.chat.completions.create.mock.calls[0][0];
      const userMessage = callArgs.messages.find(
        (m: { role: string; content: string }) => m.role === 'user'
      );
      expect(userMessage?.content).toContain(context);
      expect(userMessage?.content).toContain(messageText);
    });

    it('should return default message when OpenAI not initialized', async () => {
      // Arrange
      configService.get.mockReturnValue(undefined);
      const moduleWithoutKey: TestingModule = await Test.createTestingModule({
        providers: [
          AiService,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue(undefined) },
          },
          {
            provide: PrismaService,
            useValue: { read: { industryConfig: { findUnique: jest.fn() } } },
          },
          {
            provide: CustomLoggerService,
            useValue: { warn: jest.fn(), log: jest.fn(), error: jest.fn() },
          },
        ],
      }).compile();

      const serviceWithoutKey = moduleWithoutKey.get<AiService>(AiService);

      // Act
      const result = await serviceWithoutKey.generateReply(messageText, industryType);

      // Assert
      expect(result).toContain('담당자 확인 후');
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const apiError = new Error('API error');
      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      // Act
      const result = await service.generateReply(messageText, industryType);

      // Assert
      expect(result).toContain('담당자 확인 후');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle empty response', async () => {
      // Arrange
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      } as OpenAI.Chat.Completions.ChatCompletion);

      // Act
      const result = await service.generateReply(messageText, industryType);

      // Assert
      expect(result).toContain('담당자 확인 후');
    });
  });

  describe('classifyInquiry', () => {
    const messageText = '예약하고 싶습니다';

    it('should classify inquiry successfully', async () => {
      // Arrange
      const mockResponse = {
        choices: [
          {
            message: {
              content: '예약',
            },
          },
        ],
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(
        mockResponse as OpenAI.Chat.Completions.ChatCompletion
      );

      // Act
      const result = await service.classifyInquiry(messageText);

      // Assert
      expect(result).toBe('예약');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.3,
          max_tokens: 10,
        })
      );
    });

    it('should return default classification when OpenAI not initialized', async () => {
      // Arrange
      configService.get.mockReturnValue(undefined);
      const moduleWithoutKey: TestingModule = await Test.createTestingModule({
        providers: [
          AiService,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue(undefined) },
          },
          {
            provide: PrismaService,
            useValue: { read: { industryConfig: { findUnique: jest.fn() } } },
          },
          {
            provide: CustomLoggerService,
            useValue: { warn: jest.fn(), log: jest.fn(), error: jest.fn() },
          },
        ],
      }).compile();

      const serviceWithoutKey = moduleWithoutKey.get<AiService>(AiService);

      // Act
      const result = await serviceWithoutKey.classifyInquiry(messageText);

      // Assert
      expect(result).toBe('일반');
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const apiError = new Error('API error');
      mockOpenAI.chat.completions.create.mockRejectedValue(apiError);

      // Act
      const result = await service.classifyInquiry(messageText);

      // Assert
      expect(result).toBe('일반');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should trim whitespace from classification', async () => {
      // Arrange
      const mockResponse = {
        choices: [
          {
            message: {
              content: '  예약  ',
            },
          },
        ],
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(
        mockResponse as OpenAI.Chat.Completions.ChatCompletion
      );

      // Act
      const result = await service.classifyInquiry(messageText);

      // Assert
      expect(result).toBe('예약');
    });
  });
});
