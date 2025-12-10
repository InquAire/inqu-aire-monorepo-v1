/**
 * User Rate Limit Guard Unit Tests
 *
 * 테스트 범위:
 * - Rate Limit 검증 (limit, windowMs)
 * - 인증된 사용자 기반 제한
 * - Redis 캐시 상호작용
 * - Rate Limit 초과 시 429 응답
 * - Rate Limit 헤더 설정
 * - 비인증 사용자 처리
 * - 데코레이터 메타데이터 처리
 */

import 'reflect-metadata';

import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { CacheService } from '../modules/cache/cache.service';
import { CustomLoggerService } from '../modules/logger/logger.service';

import { UserRateLimitGuard } from './user-rate-limit.guard';

describe('UserRateLimitGuard', () => {
  let guard: UserRateLimitGuard;
  let reflector: Reflector;
  let cacheService: CacheService;
  let logger: CustomLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRateLimitGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: CustomLoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<UserRateLimitGuard>(UserRateLimitGuard);
    reflector = module.get<Reflector>(Reflector);
    cacheService = module.get<CacheService>(CacheService);
    logger = module.get<CustomLoggerService>(CustomLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should implement CanActivate', () => {
      expect(guard.canActivate).toBeDefined();
      expect(typeof guard.canActivate).toBe('function');
    });

    it('should have required dependencies injected', () => {
      expect(reflector).toBeDefined();
      expect(cacheService).toBeDefined();
      expect(logger).toBeDefined();
    });
  });

  describe('No Rate Limit Configuration', () => {
    it('should allow request when no rate limit config is set', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should allow request when rate limit config is undefined', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Unauthenticated User Handling', () => {
    it('should allow request when user is not authenticated', async () => {
      const context = createMockContext(null);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith(
        'Unauthenticated user - skipping user rate limit',
        'UserRateLimitGuard'
      );
      expect(cacheService.get).not.toHaveBeenCalled();
    });

    it('should allow request when user is undefined', async () => {
      const context = createMockContext(undefined);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow request when user.id is missing', async () => {
      const context = createMockContext({ email: 'test@example.com' } as { email: string });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith(
        'Unauthenticated user - skipping user rate limit',
        'UserRateLimitGuard'
      );
    });

    it('should allow request when user.id is null', async () => {
      const context = createMockContext({ id: null, email: 'test@example.com' } as {
        id: null;
        email: string;
      });
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Rate Limit Logic', () => {
    it('should allow request when under rate limit', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(5);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(cacheService.set).toHaveBeenCalledWith('rate-limit:user:user-123:/api/test', 6, 60);
      expect(logger.debug).toHaveBeenCalledWith(
        'User rate limit check passed',
        'UserRateLimitGuard',
        expect.objectContaining({
          userId: 'user-123',
          path: '/api/test',
          remaining: 4,
        })
      );
    });

    it('should allow first request (count = 0)', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(cacheService.set).toHaveBeenCalledWith('rate-limit:user:user-123:/api/test', 1, 60);
    });

    it('should allow request when count is null (cache miss)', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(cacheService.set).toHaveBeenCalledWith('rate-limit:user:user-123:/api/test', 1, 60);
    });

    it('should reject request when rate limit is reached (count = limit)', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(10);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'You have made too many requests. Please try again later.'
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'User rate limit exceeded',
        'UserRateLimitGuard',
        expect.objectContaining({
          userId: 'user-123',
          limit: 10,
          currentCount: 10,
        })
      );
    });

    it('should reject request when rate limit is exceeded (count > limit)', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(15);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should return 429 status code when rate limit exceeded', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(10);

      try {
        await guard.canActivate(context);
        fail('Should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect((error as HttpException).getResponse()).toEqual({
          statusCode: 429,
          message: 'You have made too many requests. Please try again later.',
          error: 'Rate Limit Exceeded',
        });
      }
    });

    it('should convert windowMs to seconds for cache TTL', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 120000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(cacheService.set).toHaveBeenCalledWith('rate-limit:user:user-123:/api/test', 1, 120);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should set X-RateLimit-Limit header', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });
      const response = context.switchToHttp().getResponse();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 60, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(30);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '60');
    });

    it('should set X-RateLimit-Remaining header', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });
      const response = context.switchToHttp().getResponse();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 60, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(30);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '29');
    });

    it('should set X-RateLimit-Reset header with future timestamp', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });
      const response = context.switchToHttp().getResponse();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 60, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(30);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const beforeTime = Date.now();
      await guard.canActivate(context);
      const afterTime = Date.now();

      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));

      const calls = (response.setHeader as jest.Mock).mock.calls;
      const resetCall = calls.find(call => call[0] === 'X-RateLimit-Reset');
      const resetTime = new Date(resetCall[1]).getTime();

      expect(resetTime).toBeGreaterThan(beforeTime);
      expect(resetTime).toBeLessThanOrEqual(afterTime + 60000);
    });

    it('should set remaining to 0 when limit is about to be reached', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });
      const response = context.switchToHttp().getResponse();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(9);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    });
  });

  describe('Cache Key Generation', () => {
    it('should include user ID and path in cache key', async () => {
      const context = createMockContext(
        { id: 'user-123', email: 'test@example.com' },
        '/api/users'
      );

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:user:user-123:/api/users');
    });

    it('should handle different paths separately for same user', async () => {
      const context1 = createMockContext(
        { id: 'user-123', email: 'test@example.com' },
        '/api/users'
      );
      const context2 = createMockContext(
        { id: 'user-123', email: 'test@example.com' },
        '/api/posts'
      );

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context1);
      await guard.canActivate(context2);

      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:user:user-123:/api/users');
      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:user:user-123:/api/posts');
    });

    it('should handle different users separately', async () => {
      const context1 = createMockContext({ id: 'user-123', email: 'user1@example.com' });
      const context2 = createMockContext({ id: 'user-456', email: 'user2@example.com' });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context1);
      await guard.canActivate(context2);

      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:user:user-123:/api/test');
      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:user:user-456:/api/test');
    });
  });

  describe('Different User Types', () => {
    it('should handle numeric user IDs', async () => {
      const context = createMockContext({ id: 12345, email: 'test@example.com' });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:user:12345:/api/test');
    });

    it('should handle UUID user IDs', async () => {
      const context = createMockContext({
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(cacheService.get).toHaveBeenCalledWith(
        'rate-limit:user:550e8400-e29b-41d4-a716-446655440000:/api/test'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle very high limits', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue({ limit: 1000000, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(999999);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle very short time windows', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 1, windowMs: 1000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(cacheService.set).toHaveBeenCalledWith('rate-limit:user:user-123:/api/test', 1, 1);
    });

    it('should handle paths with special characters', async () => {
      const context = createMockContext(
        { id: 'user-123', email: 'test@example.com' },
        '/api/users?query=value&foo=bar'
      );

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(cacheService.get).toHaveBeenCalledWith(
        'rate-limit:user:user-123:/api/users?query=value&foo=bar'
      );
    });

    it('should handle user with additional properties', async () => {
      const context = createMockContext({
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
        name: 'Test User',
      } as { id: string; email: string; role?: string; name?: string });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:user:user-123:/api/test');
    });
  });

  describe('Reflector Metadata', () => {
    it('should check both handler and class for rate limit config', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });
      const handler = context.getHandler();
      const classType = context.getClass();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith('userRateLimit', [
        handler,
        classType,
      ]);
    });
  });

  describe('Integration Scenarios', () => {
    it('should allow authenticated user within limit', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 60, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(30);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith(
        'User rate limit check passed',
        'UserRateLimitGuard',
        expect.objectContaining({ userId: 'user-123', remaining: 29 })
      );
    });

    it('should block authenticated user who exceeded limit', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 60, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(60);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      expect(logger.warn).toHaveBeenCalledWith(
        'User rate limit exceeded',
        'UserRateLimitGuard',
        expect.any(Object)
      );
    });

    it('should handle consecutive requests from same user', async () => {
      const context = createMockContext({ id: 'user-123', email: 'test@example.com' });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest
        .spyOn(cacheService, 'get')
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);
      await guard.canActivate(context);
      await guard.canActivate(context);

      expect(cacheService.set).toHaveBeenCalledWith('rate-limit:user:user-123:/api/test', 1, 60);
      expect(cacheService.set).toHaveBeenCalledWith('rate-limit:user:user-123:/api/test', 2, 60);
      expect(cacheService.set).toHaveBeenCalledWith('rate-limit:user:user-123:/api/test', 3, 60);
    });
  });
});

/**
 * Helper function to create mock ExecutionContext with authenticated user
 */
function createMockContext(
  user: { id?: string | number | null; email: string; [key: string]: unknown } | null | undefined,
  path: string = '/api/test'
): ExecutionContext {
  const mockRequest = {
    user,
    path,
  };

  const mockResponse = {
    setHeader: jest.fn(),
  };

  return {
    getClass: jest.fn(),
    getHandler: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn().mockReturnValue(mockResponse),
      getNext: jest.fn(),
    }),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn().mockReturnValue('http'),
  } as unknown as ExecutionContext;
}
