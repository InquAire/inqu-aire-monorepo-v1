/**
 * AllExceptionsFilter Unit Tests
 *
 * 테스트 범위:
 * - 모든 예외 캐치
 * - Sentry 통합
 * - 에러 응답 포맷
 * - 로깅 (error/warn 레벨)
 * - HTTP 상태 코드 처리
 * - 사용자 정보 추출
 */

import 'reflect-metadata';

import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as Sentry from '@sentry/node';
import type { Response } from 'express';

import { CustomLoggerService } from '../modules/logger/logger.service';
import type { AuthenticatedRequest } from '../types/authenticated-request.interface';

import { AllExceptionsFilter } from './all-exceptions.filter';

// Mock Sentry
jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let logger: jest.Mocked<CustomLoggerService>;
  let mockArgumentsHost: ArgumentsHost;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllExceptionsFilter,
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
    logger = module.get(CustomLoggerService) as jest.Mocked<CustomLoggerService>;

    // Setup mock request
    mockRequest = {
      url: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
      },
      body: {},
      query: {},
      params: {},
    };

    // Setup mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Setup mock arguments host
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
      getType: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should be defined', () => {
      expect(filter).toBeDefined();
    });

    it('should implement ExceptionFilter', () => {
      expect(filter.catch).toBeDefined();
      expect(typeof filter.catch).toBe('function');
    });
  });

  describe('HttpException Handling', () => {
    it('should handle BadRequestException', () => {
      // Arrange
      const exception = new BadRequestException('Bad request');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Bad request',
          error: 'BadRequestException',
          path: '/api/test',
          method: 'GET',
        })
      );
    });

    it('should handle NotFoundException', () => {
      // Arrange
      const exception = new NotFoundException('Not found');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Not found',
          error: 'NotFoundException',
        })
      );
    });

    it('should handle UnauthorizedException', () => {
      // Arrange
      const exception = new UnauthorizedException('Unauthorized');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Unauthorized',
          error: 'UnauthorizedException',
        })
      );
    });

    it('should handle InternalServerErrorException', () => {
      // Arrange
      const exception = new InternalServerErrorException('Internal server error');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(logger.error).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('should extract status code from HttpException', () => {
      // Arrange
      const exception = new HttpException('Custom error', HttpStatus.FORBIDDEN);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
        })
      );
    });

    it('should extract message from HttpException', () => {
      // Arrange
      const customMessage = 'Custom error message';
      const exception = new BadRequestException(customMessage);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: customMessage,
        })
      );
    });
  });

  describe('Non-HttpException Handling', () => {
    it('should handle generic Error', () => {
      // Arrange
      const exception = new Error('Generic error');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Generic error',
          error: 'InternalServerError',
        })
      );
    });

    it('should handle unknown exception type', () => {
      // Arrange
      const exception = { custom: 'error' };

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: 'InternalServerError',
        })
      );
    });

    it('should handle null exception', () => {
      // Arrange
      const exception = null;

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error',
        })
      );
    });

    it('should handle undefined exception', () => {
      // Arrange
      const exception = undefined;

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error',
        })
      );
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error response structure', () => {
      // Arrange
      const exception = new BadRequestException('Test error');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: expect.any(Number),
          timestamp: expect.any(String),
          path: expect.any(String),
          method: expect.any(String),
          message: expect.any(String),
          error: expect.any(String),
        })
      );
    });

    it('should include timestamp in ISO format', () => {
      // Arrange
      const exception = new BadRequestException('Test error');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      const callArgs = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include request path in response', () => {
      // Arrange
      const exception = new BadRequestException('Test error');
      mockRequest.url = '/api/custom/path';

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/custom/path',
        })
      );
    });

    it('should include request method in response', () => {
      // Arrange
      const exception = new BadRequestException('Test error');
      mockRequest.method = 'POST';

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should set success to false', () => {
      // Arrange
      const exception = new BadRequestException('Test error');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });
  });

  describe('Logging', () => {
    it('should log error for 5xx status codes', () => {
      // Arrange
      const exception = new InternalServerErrorException('Server error');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        'GET /api/test',
        expect.any(String),
        'ExceptionFilter',
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Server error',
        })
      );
    });

    it('should log warning for 4xx status codes', () => {
      // Arrange
      const exception = new BadRequestException('Bad request');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        'GET /api/test - Bad request',
        'ExceptionFilter',
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Bad request',
        })
      );
    });

    it('should include user ID in error log for 5xx errors', () => {
      // Arrange
      const exception = new InternalServerErrorException('Server error');
      mockRequest.user = { id: 'user-123', email: 'test@example.com', role: 'USER' };

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'ExceptionFilter',
        expect.objectContaining({
          userId: 'user-123',
        })
      );
    });

    it('should include IP address in error log for 5xx errors', () => {
      // Arrange
      const exception = new InternalServerErrorException('Server error');
      Object.defineProperty(mockRequest, 'ip', {
        value: '192.168.1.1',
        writable: true,
        configurable: true,
      });

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'ExceptionFilter',
        expect.objectContaining({
          ip: '192.168.1.1',
        })
      );
    });

    it('should include user agent in error log for 5xx errors', () => {
      // Arrange
      const exception = new InternalServerErrorException('Server error');
      mockRequest.headers = { 'user-agent': 'Mozilla/5.0' };

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'ExceptionFilter',
        expect.objectContaining({
          userAgent: 'Mozilla/5.0',
        })
      );
    });

    it('should include stack trace in error log for Error instances', () => {
      // Arrange
      const exception = new Error('Test error');
      exception.stack = 'Error: Test error\n    at test.js:1:1';

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        'Error: Test error\n    at test.js:1:1',
        'ExceptionFilter',
        expect.any(Object)
      );
    });

    it('should not include stack trace for non-Error instances in 5xx errors', () => {
      // Arrange
      const exception = { custom: 'error' };

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(logger.error).toHaveBeenCalledWith(
        expect.any(String),
        undefined,
        'ExceptionFilter',
        expect.any(Object)
      );
    });

    it('should not log error for 4xx status codes', () => {
      // Arrange
      const exception = new BadRequestException('Bad request');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('Sentry Integration', () => {
    it('should report 5xx errors to Sentry', () => {
      // Arrange
      const exception = new InternalServerErrorException('Server error');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(Sentry.captureException).toHaveBeenCalledWith(exception, {
        level: 'error',
        tags: {
          path: '/api/test',
          method: 'GET',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR.toString(),
        },
        extra: {
          userId: undefined,
          ip: '127.0.0.1',
          body: {},
          query: {},
          params: {},
        },
      });
    });

    it('should not report 4xx errors to Sentry', () => {
      // Arrange
      const exception = new BadRequestException('Bad request');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('should include user ID in Sentry report when available', () => {
      // Arrange
      const exception = new InternalServerErrorException('Server error');
      mockRequest.user = { id: 'user-123', email: 'test@example.com', role: 'USER' };

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(Sentry.captureException).toHaveBeenCalledWith(
        exception,
        expect.objectContaining({
          extra: expect.objectContaining({
            userId: 'user-123',
          }),
        })
      );
    });

    it('should include request body in Sentry report', () => {
      // Arrange
      const exception = new InternalServerErrorException('Server error');
      mockRequest.body = { key: 'value' };

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(Sentry.captureException).toHaveBeenCalledWith(
        exception,
        expect.objectContaining({
          extra: expect.objectContaining({
            body: { key: 'value' },
          }),
        })
      );
    });

    it('should include query parameters in Sentry report', () => {
      // Arrange
      const exception = new InternalServerErrorException('Server error');
      mockRequest.query = { page: '1', limit: '10' };

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(Sentry.captureException).toHaveBeenCalledWith(
        exception,
        expect.objectContaining({
          extra: expect.objectContaining({
            query: { page: '1', limit: '10' },
          }),
        })
      );
    });

    it('should include route parameters in Sentry report', () => {
      // Arrange
      const exception = new InternalServerErrorException('Server error');
      mockRequest.params = { id: '123' };

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(Sentry.captureException).toHaveBeenCalledWith(
        exception,
        expect.objectContaining({
          extra: expect.objectContaining({
            params: { id: '123' },
          }),
        })
      );
    });

    it('should not report non-Error exceptions to Sentry', () => {
      // Arrange
      const exception = { custom: 'error' };

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('should include correct tags in Sentry report', () => {
      // Arrange
      const exception = new InternalServerErrorException('Server error');
      mockRequest.url = '/api/custom';
      mockRequest.method = 'POST';

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(Sentry.captureException).toHaveBeenCalledWith(
        exception,
        expect.objectContaining({
          tags: {
            path: '/api/custom',
            method: 'POST',
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR.toString(),
          },
        })
      );
    });
  });

  describe('Status Code Handling', () => {
    it('should handle 400 Bad Request', () => {
      // Arrange
      const exception = new BadRequestException('Bad request');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle 401 Unauthorized', () => {
      // Arrange
      const exception = new UnauthorizedException('Unauthorized');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should handle 404 Not Found', () => {
      // Arrange
      const exception = new NotFoundException('Not found');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle 500 Internal Server Error', () => {
      // Arrange
      const exception = new InternalServerErrorException('Server error');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should default to 500 for unknown exceptions', () => {
      // Arrange
      const exception = new Error('Unknown error');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Request Context', () => {
    it('should extract request from ArgumentsHost', () => {
      // Arrange
      const exception = new BadRequestException('Test error');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockArgumentsHost.switchToHttp).toHaveBeenCalled();
    });

    it('should extract response from ArgumentsHost', () => {
      // Arrange
      const exception = new BadRequestException('Test error');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle different HTTP methods', () => {
      // Arrange
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        mockRequest.method = method;
        const exception = new BadRequestException('Test error');

        // Act
        filter.catch(exception, mockArgumentsHost);

        // Assert
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            method,
          })
        );
      }
    });

    it('should handle different request paths', () => {
      // Arrange
      const paths = ['/api/users', '/api/inquiries', '/api/auth/login'];

      for (const path of paths) {
        mockRequest.url = path;
        const exception = new BadRequestException('Test error');

        // Act
        filter.catch(exception, mockArgumentsHost);

        // Assert
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            path,
          })
        );
      }
    });
  });

  describe('User Context', () => {
    it('should handle request without user', () => {
      // Arrange
      const exception = new BadRequestException('Test error');
      mockRequest.user = undefined;

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        'ExceptionFilter',
        expect.objectContaining({
          userId: undefined,
        })
      );
    });

    it('should handle request with user', () => {
      // Arrange
      const exception = new BadRequestException('Test error');
      mockRequest.user = { id: 'user-123', email: 'test@example.com', role: 'USER' };

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        'ExceptionFilter',
        expect.objectContaining({
          userId: 'user-123',
        })
      );
    });
  });

  describe('Response Chaining', () => {
    it('should chain status and json methods', () => {
      // Arrange
      const exception = new BadRequestException('Test error');
      const statusMock = jest.fn().mockReturnThis();
      const jsonMock = jest.fn().mockReturnThis();
      mockResponse.status = statusMock;
      mockResponse.json = jsonMock;

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(statusMock).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalled();
    });
  });
});
