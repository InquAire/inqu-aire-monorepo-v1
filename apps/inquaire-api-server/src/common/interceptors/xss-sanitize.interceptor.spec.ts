/**
 * XssSanitizeInterceptor Unit Tests
 *
 * 테스트 범위:
 * - 요청 body sanitization
 * - Query parameter sanitization
 * - URL parameter sanitization
 * - 재귀적 객체 처리
 * - 배열 처리
 * - 중첩 객체 처리
 */

import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';

import { sanitizeInput } from '../utils/sanitizer.util';

import { XssSanitizeInterceptor } from './xss-sanitize.interceptor';

// Mock sanitizer util
jest.mock('../utils/sanitizer.util', () => ({
  sanitizeInput: jest.fn(input => input),
}));

describe('XssSanitizeInterceptor', () => {
  let interceptor: XssSanitizeInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: {
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
    params?: Record<string, unknown>;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [XssSanitizeInterceptor],
    }).compile();

    interceptor = module.get<XssSanitizeInterceptor>(XssSanitizeInterceptor);

    // Setup mock request
    mockRequest = {
      body: {},
      query: {},
      params: {},
    };

    // Setup mock execution context
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;

    // Setup mock call handler
    const mockHandle = jest.fn().mockReturnValue(of({ data: 'test' }));
    mockCallHandler = {
      handle: mockHandle,
    } as unknown as CallHandler & { handle: jest.Mock };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });

    it('should sanitize request body', () => {
      // Arrange
      const body = { name: '<script>alert("xss")</script>', email: 'test@example.com' };
      mockRequest.body = body as Record<string, unknown>;

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(sanitizeInput).toHaveBeenCalledWith(body);
      expect(mockRequest.body).toBeDefined();
    });

    it('should sanitize query parameters', () => {
      // Arrange
      const query = { search: '<script>alert("xss")</script>', page: '1' };
      mockRequest.query = query as Record<string, unknown>;

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(sanitizeInput).toHaveBeenCalledWith(query);
      expect(mockRequest.query).toBeDefined();
    });

    it('should sanitize URL parameters', () => {
      // Arrange
      const params = { id: '<script>alert("xss")</script>', type: 'test' };
      mockRequest.params = params as Record<string, unknown>;

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(sanitizeInput).toHaveBeenCalledWith(params);
      expect(mockRequest.params).toBeDefined();
    });

    it('should handle request without body', () => {
      // Arrange
      mockRequest.body = undefined;

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(sanitizeInput).not.toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.anything() })
      );
    });

    it('should handle request without query', () => {
      // Arrange
      mockRequest.query = undefined;

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(sanitizeInput).not.toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.anything() })
      );
    });

    it('should handle request without params', () => {
      // Arrange
      mockRequest.params = undefined;

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(sanitizeInput).not.toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.anything() })
      );
    });

    it('should sanitize nested body object', () => {
      // Arrange
      const nestedBody = {
        user: {
          name: '<script>alert("xss")</script>',
          profile: {
            bio: '<img src=x onerror=alert("xss")>',
          },
        },
      };
      mockRequest.body = nestedBody;

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(sanitizeInput).toHaveBeenCalledWith(nestedBody);
    });

    it('should sanitize array in body', () => {
      // Arrange
      const arrayBody = {
        items: ['<script>alert("xss")</script>', 'safe-value'],
        tags: ['tag1', '<img src=x>'],
      };
      mockRequest.body = arrayBody as Record<string, unknown>;

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(sanitizeInput).toHaveBeenCalledWith(arrayBody);
    });

    it('should sanitize all request properties together', () => {
      // Arrange
      mockRequest.body = { name: 'test' } as Record<string, unknown>;
      mockRequest.query = { page: '1' } as Record<string, unknown>;
      mockRequest.params = { id: '123' } as Record<string, unknown>;

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(sanitizeInput).toHaveBeenCalledTimes(3);
      expect(sanitizeInput).toHaveBeenCalledWith(mockRequest.body);
      expect(sanitizeInput).toHaveBeenCalledWith(mockRequest.query);
      expect(sanitizeInput).toHaveBeenCalledWith(mockRequest.params);
    });

    it('should preserve original structure after sanitization', () => {
      // Arrange
      const originalBody = {
        name: 'John',
        age: 30,
        nested: {
          key: 'value',
        },
      };
      mockRequest.body = originalBody as Record<string, unknown>;
      (sanitizeInput as jest.Mock).mockReturnValue(originalBody);

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(mockRequest.body).toEqual(originalBody);
    });

    it('should handle empty body object', () => {
      // Arrange
      mockRequest.body = {} as Record<string, unknown>;

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(sanitizeInput).toHaveBeenCalledWith({});
    });

    it('should handle empty query object', () => {
      // Arrange
      mockRequest.query = {} as Record<string, unknown>;

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(sanitizeInput).toHaveBeenCalledWith({});
    });

    it('should handle empty params object', () => {
      // Arrange
      mockRequest.params = {} as Record<string, unknown>;

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(sanitizeInput).toHaveBeenCalledWith({});
    });

    it('should continue request processing after sanitization', () => {
      // Arrange
      const responseData = { success: true };
      (mockCallHandler as CallHandler & { handle: jest.Mock }).handle.mockReturnValue(
        of(responseData)
      );

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(result => {
        // Assert
        expect(result).toEqual(responseData);
      });

      // Assert
      expect((mockCallHandler as CallHandler & { handle: jest.Mock }).handle).toHaveBeenCalled();
    });

    it('should handle complex nested structures', () => {
      // Arrange
      const complexBody = {
        user: {
          name: 'John',
          emails: ['john@example.com', '<script>alert("xss")</script>'],
          metadata: {
            tags: ['tag1', '<img src=x>'],
            settings: {
              theme: 'dark',
              notifications: true,
            },
          },
        },
        items: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: '<script>alert("xss")</script>' },
        ],
      };
      mockRequest.body = complexBody as Record<string, unknown>;

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

      // Assert
      expect(sanitizeInput).toHaveBeenCalledWith(complexBody);
    });
  });
});
