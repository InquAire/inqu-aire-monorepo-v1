/**
 * IP Rate Limit Guard Unit Tests
 *
 * 테스트 범위:
 * - Rate Limit 검증 (limit, windowMs)
 * - IP 주소 추출 (CF-Connecting-IP, X-Forwarded-For, X-Real-IP, request.ip)
 * - Redis 캐시 상호작용
 * - Rate Limit 초과 시 429 응답
 * - Rate Limit 헤더 설정
 * - 데코레이터 메타데이터 처리
 */

import 'reflect-metadata';

import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { CacheService } from '../modules/cache/cache.service';
import { CustomLoggerService } from '../modules/logger/logger.service';

import { IpRateLimitGuard } from './ip-rate-limit.guard';

describe('IpRateLimitGuard', () => {
  let guard: IpRateLimitGuard;
  let reflector: Reflector;
  let cacheService: CacheService;
  let logger: CustomLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpRateLimitGuard,
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

    guard = module.get<IpRateLimitGuard>(IpRateLimitGuard);
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
      const context = createMockContext('192.168.1.1');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(cacheService.get).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should allow request when rate limit config is undefined', async () => {
      const context = createMockContext('192.168.1.1');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('IP Address Extraction', () => {
    it('should extract IP from CF-Connecting-IP header (highest priority)', async () => {
      const context = createMockContext('192.168.1.1', {
        'cf-connecting-ip': '203.0.113.1',
        'x-forwarded-for': '198.51.100.1',
        'x-real-ip': '192.0.2.1',
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:ip:203.0.113.1:/api/test');
    });

    it('should extract IP from X-Forwarded-For header (second priority)', async () => {
      const context = createMockContext('192.168.1.1', {
        'x-forwarded-for': '198.51.100.1, 198.51.100.2',
        'x-real-ip': '192.0.2.1',
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:ip:198.51.100.1:/api/test');
    });

    it('should extract IP from X-Real-IP header (third priority)', async () => {
      const context = createMockContext('192.168.1.1', {
        'x-real-ip': '192.0.2.1',
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:ip:192.0.2.1:/api/test');
    });

    it('should extract IP from request.ip (fourth priority)', async () => {
      const context = createMockContext('192.168.1.1');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:ip:192.168.1.1:/api/test');
    });

    it('should extract IP from socket.remoteAddress (last fallback)', async () => {
      const context = createMockContext(null, {}, '203.0.113.5');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:ip:203.0.113.5:/api/test');
    });

    it('should allow request when IP cannot be extracted', async () => {
      const context = createMockContext(null);

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith('Failed to extract client IP', 'IpRateLimitGuard');
      expect(cacheService.get).not.toHaveBeenCalled();
    });

    it('should handle X-Forwarded-For with single IP', async () => {
      const context = createMockContext('192.168.1.1', {
        'x-forwarded-for': '198.51.100.1',
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:ip:198.51.100.1:/api/test');
    });

    it('should trim whitespace in X-Forwarded-For IPs', async () => {
      const context = createMockContext('192.168.1.1', {
        'x-forwarded-for': '  198.51.100.1  ,  198.51.100.2  ',
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:ip:198.51.100.1:/api/test');
    });
  });

  describe('Rate Limit Logic', () => {
    it('should allow request when under rate limit', async () => {
      const context = createMockContext('192.168.1.1');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(5);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(cacheService.set).toHaveBeenCalledWith('rate-limit:ip:192.168.1.1:/api/test', 6, 60);
    });

    it('should allow first request (count = 0)', async () => {
      const context = createMockContext('192.168.1.1');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(cacheService.set).toHaveBeenCalledWith('rate-limit:ip:192.168.1.1:/api/test', 1, 60);
    });

    it('should allow request when count is null (cache miss)', async () => {
      const context = createMockContext('192.168.1.1');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(cacheService.set).toHaveBeenCalledWith('rate-limit:ip:192.168.1.1:/api/test', 1, 60);
    });

    it('should reject request when rate limit is reached (count = limit)', async () => {
      const context = createMockContext('192.168.1.1');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(10);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Too many requests from this IP. Please try again later.'
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Rate limit exceeded',
        'IpRateLimitGuard',
        expect.objectContaining({
          ip: '192.168.1.1',
          limit: 10,
          currentCount: 10,
        })
      );
    });

    it('should reject request when rate limit is exceeded (count > limit)', async () => {
      const context = createMockContext('192.168.1.1');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(15);

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should return 429 status code when rate limit exceeded', async () => {
      const context = createMockContext('192.168.1.1');

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
          message: 'Too many requests from this IP. Please try again later.',
          error: 'Rate Limit Exceeded',
        });
      }
    });

    it('should convert windowMs to seconds for cache TTL', async () => {
      const context = createMockContext('192.168.1.1');

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue({ limit: 10, windowMs: 120000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(cacheService.set).toHaveBeenCalledWith('rate-limit:ip:192.168.1.1:/api/test', 1, 120);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should set X-RateLimit-Limit header', async () => {
      const context = createMockContext('192.168.1.1');
      const response = context.switchToHttp().getResponse();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 100, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(50);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
    });

    it('should set X-RateLimit-Remaining header', async () => {
      const context = createMockContext('192.168.1.1');
      const response = context.switchToHttp().getResponse();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 100, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(50);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '49');
    });

    it('should set X-RateLimit-Reset header with future timestamp', async () => {
      const context = createMockContext('192.168.1.1');
      const response = context.switchToHttp().getResponse();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 100, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(50);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const beforeTime = Date.now();
      await guard.canActivate(context);
      const afterTime = Date.now();

      expect(response.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        expect.any(String)
      );

      const calls = (response.setHeader as jest.Mock).mock.calls;
      const resetCall = calls.find(call => call[0] === 'X-RateLimit-Reset');
      const resetTime = new Date(resetCall[1]).getTime();

      expect(resetTime).toBeGreaterThan(beforeTime);
      expect(resetTime).toBeLessThanOrEqual(afterTime + 60000);
    });

    it('should set remaining to 0 when limit is about to be reached', async () => {
      const context = createMockContext('192.168.1.1');
      const response = context.switchToHttp().getResponse();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(9);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    });
  });

  describe('Cache Key Generation', () => {
    it('should include IP and path in cache key', async () => {
      const context = createMockContext('192.168.1.1', {}, null, '/api/users');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:ip:192.168.1.1:/api/users');
    });

    it('should handle different paths separately', async () => {
      const context1 = createMockContext('192.168.1.1', {}, null, '/api/users');
      const context2 = createMockContext('192.168.1.1', {}, null, '/api/posts');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context1);
      await guard.canActivate(context2);

      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:ip:192.168.1.1:/api/users');
      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:ip:192.168.1.1:/api/posts');
    });

    it('should handle different IPs separately', async () => {
      const context1 = createMockContext('192.168.1.1');
      const context2 = createMockContext('192.168.1.2');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context1);
      await guard.canActivate(context2);

      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:ip:192.168.1.1:/api/test');
      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:ip:192.168.1.2:/api/test');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very high limits', async () => {
      const context = createMockContext('192.168.1.1');

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue({ limit: 1000000, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(999999);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle very short time windows', async () => {
      const context = createMockContext('192.168.1.1');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 1, windowMs: 1000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(cacheService.set).toHaveBeenCalledWith('rate-limit:ip:192.168.1.1:/api/test', 1, 1);
    });

    it('should handle IPv6 addresses', async () => {
      const context = createMockContext('2001:0db8:85a3::8a2e:0370:7334');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(cacheService.get).toHaveBeenCalledWith(
        'rate-limit:ip:2001:0db8:85a3::8a2e:0370:7334:/api/test'
      );
    });

    it('should handle paths with special characters', async () => {
      const context = createMockContext('192.168.1.1', {}, null, '/api/users?query=value&foo=bar');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(cacheService.get).toHaveBeenCalledWith(
        'rate-limit:ip:192.168.1.1:/api/users?query=value&foo=bar'
      );
    });

    it('should handle empty X-Forwarded-For gracefully', async () => {
      const context = createMockContext('192.168.1.1', {
        'x-forwarded-for': '',
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      // Should fall back to request.ip
      expect(cacheService.get).toHaveBeenCalledWith('rate-limit:ip:192.168.1.1:/api/test');
    });
  });

  describe('Reflector Metadata', () => {
    it('should check both handler and class for rate limit config', async () => {
      const context = createMockContext('192.168.1.1');
      const handler = context.getHandler();
      const classType = context.getClass();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ limit: 10, windowMs: 60000 });
      jest.spyOn(cacheService, 'get').mockResolvedValue(0);
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);

      await guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        'ipRateLimit',
        [handler, classType]
      );
    });
  });
});

/**
 * Helper function to create mock ExecutionContext
 */
function createMockContext(
  ip: string | null,
  headers: Record<string, string> = {},
  socketRemoteAddress?: string | null,
  path: string = '/api/test'
): ExecutionContext {
  const mockRequest = {
    ip,
    path,
    headers,
    socket: socketRemoteAddress ? { remoteAddress: socketRemoteAddress } : {},
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
