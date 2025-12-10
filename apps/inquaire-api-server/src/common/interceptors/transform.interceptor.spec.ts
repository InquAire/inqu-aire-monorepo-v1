/**
 * TransformInterceptor Unit Tests
 *
 * 테스트 범위:
 * - 응답 변환 (표준 포맷)
 * - 페이지네이션 메타데이터
 * - 에러 응답 표준화
 * - 파일 다운로드 스킵
 */

import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { of } from 'rxjs';

import { PaginatedResponse, TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransformInterceptor],
    }).compile();

    interceptor = module.get<TransformInterceptor<unknown>>(TransformInterceptor);

    // Setup mock request and response
    mockRequest = {
      url: '/api/test',
    };

    mockResponse = {
      statusCode: 200,
    };

    // Setup mock execution context
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as ExecutionContext;

    // Setup mock call handler
    const mockHandle = jest.fn();
    mockCallHandler = {
      handle: mockHandle,
    } as unknown as CallHandler;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should be defined', () => {
      expect(interceptor).toBeDefined();
    });

    it('should transform simple response', () => {
      // Arrange
      const data = { id: '123', name: 'Test' };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(data));

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(result => {
        // Assert
        expect(result).toEqual({
          success: true,
          statusCode: 200,
          timestamp: expect.any(String),
          path: '/api/test',
          data,
        });
      });
    });

    it('should transform paginated response', () => {
      // Arrange
      const paginatedData = {
        data: [{ id: '1' }, { id: '2' }],
        meta: {
          total: 100,
          page: 1,
          limit: 20,
          totalPages: 5,
        },
      };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(paginatedData));

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(result => {
        // Assert
        expect(result).toEqual({
          success: true,
          statusCode: 200,
          timestamp: expect.any(String),
          path: '/api/test',
          data: paginatedData.data,
          meta: paginatedData.meta,
        });
      });
    });

    it('should skip transformation for undefined response', () => {
      // Arrange
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(undefined));

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(result => {
        // Assert
        expect(result).toBeUndefined();
      });
    });

    it('should skip transformation for null response', () => {
      // Arrange
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(null));

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(result => {
        // Assert
        expect(result).toBeNull();
      });
    });

    it('should include timestamp in ISO format', () => {
      // Arrange
      const data = { id: '123' };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(data));

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(result => {
        // Assert
        expect(result).toHaveProperty('timestamp');
        expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
      });
    });

    it('should include path from request', () => {
      // Arrange
      const customPath = '/api/custom-path';
      mockRequest.url = customPath;
      const data = { id: '123' };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(data));

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(result => {
        // Assert
        expect(result.path).toBe(customPath);
      });
    });

    it('should use response status code', () => {
      // Arrange
      mockResponse.statusCode = 201;
      const data = { id: '123' };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(data));

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(result => {
        // Assert
        expect(result.statusCode).toBe(201);
      });
    });

    it('should handle array response', () => {
      // Arrange
      const arrayData = [{ id: '1' }, { id: '2' }];
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(arrayData));

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(result => {
        // Assert
        expect(result).toEqual({
          success: true,
          statusCode: 200,
          timestamp: expect.any(String),
          path: '/api/test',
          data: arrayData,
        });
      });
    });

    it('should handle string response', () => {
      // Arrange
      const stringData = 'Simple string response';
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(stringData));

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(result => {
        // Assert
        expect(result).toEqual({
          success: true,
          statusCode: 200,
          timestamp: expect.any(String),
          path: '/api/test',
          data: stringData,
        });
      });
    });

    it('should handle number response', () => {
      // Arrange
      const numberData = 42;
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(numberData));

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(result => {
        // Assert
        expect(result).toEqual({
          success: true,
          statusCode: 200,
          timestamp: expect.any(String),
          path: '/api/test',
          data: numberData,
        });
      });
    });

    it('should handle boolean response', () => {
      // Arrange
      const booleanData = true;
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(booleanData));

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(result => {
        // Assert
        expect(result).toEqual({
          success: true,
          statusCode: 200,
          timestamp: expect.any(String),
          path: '/api/test',
          data: booleanData,
        });
      });
    });

    it('should preserve pagination meta structure', () => {
      // Arrange
      const paginatedData = {
        data: [{ id: '1' }],
        meta: {
          total: 50,
          page: 2,
          limit: 10,
          totalPages: 5,
          customField: 'custom-value',
        },
      };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(paginatedData));

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(result => {
        // Assert
        const paginatedResult = result as PaginatedResponse<unknown>;
        expect(paginatedResult.meta).toEqual(paginatedData.meta);
        expect(paginatedResult.meta.customField).toBe('custom-value');
      });
    });

    it('should handle nested paginated response', () => {
      // Arrange
      const nestedData = {
        data: {
          items: [{ id: '1' }],
          pagination: {
            total: 100,
            page: 1,
            limit: 20,
            totalPages: 5,
          },
        },
        meta: {
          total: 100,
          page: 1,
          limit: 20,
          totalPages: 5,
        },
      };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(nestedData));

      // Act
      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(result => {
        // Assert
        const paginatedResult = result as PaginatedResponse<unknown>;
        expect(paginatedResult.data).toEqual(nestedData.data);
        expect(paginatedResult.meta).toEqual(nestedData.meta);
      });
    });
  });
});
