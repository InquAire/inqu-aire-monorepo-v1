/**
 * LoggingInterceptor Unit Tests
 *
 * 테스트 범위:
 * - HTTP 요청/응답 로깅
 * - 요청 ID 추적
 * - 응답 시간 측정
 * - 민감 정보 마스킹
 * - 에러 로깅
 * - Health check 스킵
 */

import { CallHandler, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { of, throwError } from 'rxjs';

import { CustomLoggerService } from '../modules/logger/logger.service';

import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logger: jest.Mocked<CustomLoggerService>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: Partial<Request & { user?: { id: string } }>;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    // Create mock logger
    const mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      logHttpRequest: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
    logger = module.get(CustomLoggerService) as jest.Mocked<CustomLoggerService>;

    // Setup mock request and response
    mockRequest = {
      method: 'GET',
      url: '/api/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
        'x-request-id': undefined,
      },
      user: {
        id: 'user-123',
      },
    };

    mockResponse = {
      statusCode: 200,
      setHeader: jest.fn(),
    };

    // Setup mock execution context
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ExecutionContext;

    // Setup mock call handler
    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ data: 'test' })),
    } as unknown as CallHandler;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });

    it('should log incoming request', () => {
      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(logger.log).toHaveBeenCalledWith(
        'Incoming Request',
        'HTTP',
        expect.objectContaining({
          requestId: expect.any(String),
          method: 'GET',
          url: '/api/test',
          ip: '127.0.0.1',
        })
      );
    });

    it('should generate request ID if not present', () => {
      // Arrange
      if (mockRequest.headers) {
        delete mockRequest.headers['x-request-id'];
      }

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(mockRequest.headers?.['x-request-id']).toBeDefined();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
    });

    it('should use existing request ID if present', () => {
      // Arrange
      const existingRequestId = 'existing-request-id';
      if (mockRequest.headers) {
        mockRequest.headers['x-request-id'] = existingRequestId;
      }

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(mockRequest.headers?.['x-request-id']).toBe(existingRequestId);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', existingRequestId);
    });

    it('should log successful response', () => {
      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(logger.logHttpRequest).toHaveBeenCalledWith(
        'GET',
        '/api/test',
        200,
        expect.any(Number),
        expect.objectContaining({
          requestId: expect.any(String),
          ip: '127.0.0.1',
          userId: 'user-123',
        })
      );
    });

    it('should log error response', () => {
      // Arrange
      const error = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          // Expected error
        },
      });

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Request Failed: GET /api/test',
        expect.any(String),
        'HTTP',
        expect.objectContaining({
          requestId: expect.any(String),
          method: 'GET',
          url: '/api/test',
          statusCode: 400,
          duration: expect.any(Number),
          errorName: 'HttpException',
          errorMessage: 'Test error',
        })
      );
    });

    it('should skip logging for health check endpoint', () => {
      // Arrange
      mockRequest.url = '/health';

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(logger.log).not.toHaveBeenCalled();
      expect(logger.logHttpRequest).not.toHaveBeenCalled();
    });

    it('should skip logging for metrics endpoint', () => {
      // Arrange
      mockRequest.url = '/metrics';

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(logger.log).not.toHaveBeenCalled();
      expect(logger.logHttpRequest).not.toHaveBeenCalled();
    });

    it('should skip logging for favicon', () => {
      // Arrange
      mockRequest.url = '/favicon.ico';

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(logger.log).not.toHaveBeenCalled();
      expect(logger.logHttpRequest).not.toHaveBeenCalled();
    });

    it('should handle requests without user', () => {
      // Arrange
      delete mockRequest.user;

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(logger.logHttpRequest).toHaveBeenCalledWith(
        'GET',
        '/api/test',
        200,
        expect.any(Number),
        expect.objectContaining({
          userId: undefined,
        })
      );
    });

    it('should handle requests without user-agent', () => {
      // Arrange
      if (mockRequest.headers) {
        delete mockRequest.headers['user-agent'];
      }

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(logger.log).toHaveBeenCalledWith(
        'Incoming Request',
        'HTTP',
        expect.objectContaining({
          userAgent: 'unknown',
        })
      );
    });

    it('should measure response time', () => {
      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(logger.logHttpRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );

      const callArgs = logger.logHttpRequest.mock.calls[0];
      const duration = callArgs[3];
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle non-HTTP exceptions', () => {
      // Arrange
      const error = new Error('Generic error');
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          // Expected error
        },
      });

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Request Failed: GET /api/test',
        expect.any(String),
        'HTTP',
        expect.objectContaining({
          statusCode: 500,
          errorName: 'Error',
          errorMessage: 'Generic error',
        })
      );
    });

    it('should handle errors without status property', () => {
      // Arrange
      const error = { message: 'Unknown error' };
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          // Expected error
        },
      });

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'Request Failed: GET /api/test',
        undefined,
        'HTTP',
        expect.objectContaining({
          statusCode: 500,
        })
      );
    });
  });
});
