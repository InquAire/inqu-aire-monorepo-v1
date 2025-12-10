/**
 * CSRF Guard Unit Tests
 *
 * 테스트 범위:
 * - @SkipCsrf() 데코레이터 처리
 * - HTTP 메서드별 검증 (GET/HEAD/OPTIONS 스킵, POST/PUT/DELETE 검증)
 * - Origin/Referer 헤더 검증
 * - 허용된 Origin 목록 확인
 * - 와일드카드 서브도메인 지원
 * - CSRF 공격 시나리오
 */

import 'reflect-metadata';

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { SKIP_CSRF_KEY } from '../decorators/skip-csrf.decorator';
import { CustomLoggerService } from '../modules/logger/logger.service';

import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  let reflector: Reflector;
  let configService: ConfigService;
  let logger: CustomLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsrfGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: CustomLoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<CsrfGuard>(CsrfGuard);
    reflector = module.get<Reflector>(Reflector);
    configService = module.get<ConfigService>(ConfigService);
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
      expect(configService).toBeDefined();
      expect(logger).toBeDefined();
    });
  });

  describe('@SkipCsrf() Decorator Handling', () => {
    it('should skip CSRF check when @SkipCsrf() is applied to handler', () => {
      const context = createMockContext('POST', 'http://evil.com');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(SKIP_CSRF_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(logger.log).toHaveBeenCalledWith(
        'CSRF check skipped - @SkipCsrf() decorator',
        'CsrfGuard'
      );
    });

    it('should skip CSRF check when @SkipCsrf() is applied to class', () => {
      const context = createMockContext('POST', 'http://evil.com');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should not skip CSRF check when @SkipCsrf() is not applied', () => {
      const context = createMockContext('POST', 'http://localhost:3000');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'CORS_ORIGIN') return '';
        if (key === 'PORT') return 3000;
        return defaultValue;
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('HTTP Method Filtering', () => {
    it('should allow GET requests without Origin header', () => {
      const context = createMockContext('GET');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow HEAD requests without Origin header', () => {
      const context = createMockContext('HEAD');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow OPTIONS requests without Origin header', () => {
      const context = createMockContext('OPTIONS');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should check CSRF for POST requests', () => {
      const context = createMockContext('POST');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Missing Origin or Referer header');
    });

    it('should check CSRF for PUT requests', () => {
      const context = createMockContext('PUT');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should check CSRF for PATCH requests', () => {
      const context = createMockContext('PATCH');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should check CSRF for DELETE requests', () => {
      const context = createMockContext('DELETE');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should handle lowercase method names', () => {
      const context = createMockContext('post', 'http://localhost:3000');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'CORS_ORIGIN') return '';
        if (key === 'PORT') return 3000;
        return defaultValue;
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle mixed case method names', () => {
      const context = createMockContext('PoSt', 'http://localhost:3000');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'CORS_ORIGIN') return '';
        if (key === 'PORT') return 3000;
        return defaultValue;
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Origin Header Validation', () => {
    it('should accept request with valid Origin from config', () => {
      const origin = 'https://example.com';
      const context = createMockContext('POST', origin);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue(origin);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(logger.log).toHaveBeenCalledWith(`CSRF check passed: ${origin}`, 'CsrfGuard');
    });

    it('should reject request with invalid Origin', () => {
      const context = createMockContext('POST', 'http://evil.com');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue('https://example.com');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'CSRF check failed - Origin not allowed: http://evil.com'
      );
    });

    it('should reject request without Origin or Referer header', () => {
      const context = createMockContext('POST');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Missing Origin or Referer header');
      expect(logger.warn).toHaveBeenCalledWith(
        'CSRF check failed - No Origin or Referer header',
        'CsrfGuard',
        expect.any(Object)
      );
    });

    it('should extract origin from Referer header when Origin is missing', () => {
      const referer = 'https://example.com/some/path?query=value';
      const context = createMockContext('POST', null, referer);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue('https://example.com');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should prioritize Origin header over Referer', () => {
      const origin = 'https://example.com';
      const referer = 'https://evil.com/path';
      const context = createMockContext('POST', origin, referer);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue(origin);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle invalid Referer URL gracefully', () => {
      const context = createMockContext('POST', null, 'not-a-valid-url');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(context)).toThrow('Missing Origin or Referer header');
    });
  });

  describe('Multiple Allowed Origins', () => {
    it('should accept request from any allowed origin', () => {
      const context = createMockContext('POST', 'https://example.com');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest
        .spyOn(configService, 'get')
        .mockReturnValue('https://example.com,https://app.example.com,http://localhost:3000');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should accept request from second allowed origin', () => {
      const context = createMockContext('POST', 'https://app.example.com');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest
        .spyOn(configService, 'get')
        .mockReturnValue('https://example.com,https://app.example.com');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should trim whitespace from configured origins', () => {
      const context = createMockContext('POST', 'https://example.com');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest
        .spyOn(configService, 'get')
        .mockReturnValue(' https://example.com , https://app.example.com ');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Wildcard Subdomain Support', () => {
    it('should accept subdomain with wildcard pattern (*.example.com)', () => {
      const context = createMockContext('POST', 'https://app.example.com');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue('https://*.example.com');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should accept multiple subdomains with wildcard', () => {
      const context = createMockContext('POST', 'https://admin.app.example.com');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue('https://*.example.com');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should reject domain that does not match wildcard pattern', () => {
      const context = createMockContext('POST', 'https://evil.com');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue('https://*.example.com');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should reject subdomain with different TLD', () => {
      const context = createMockContext('POST', 'https://app.example.org');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue('https://*.example.com');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should handle wildcard with port number', () => {
      const context = createMockContext('POST', 'http://app.localhost:3000');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue('http://*.localhost:3000');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Default Localhost Origins', () => {
    it('should use localhost origins when CORS_ORIGIN is empty', () => {
      const context = createMockContext('POST', 'http://localhost:3000');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'CORS_ORIGIN') return '';
        if (key === 'PORT') return 3000;
        return defaultValue;
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should accept 127.0.0.1 when CORS_ORIGIN is not configured', () => {
      const context = createMockContext('POST', 'http://127.0.0.1:3000');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'CORS_ORIGIN') return '';
        if (key === 'PORT') return 3000;
        return defaultValue;
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should use custom port from config', () => {
      const context = createMockContext('POST', 'http://localhost:8080');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'CORS_ORIGIN') return '';
        if (key === 'PORT') return 8080;
        return defaultValue;
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('CSRF Attack Scenarios', () => {
    it('should block cross-site POST request from evil.com', () => {
      const context = createMockContext('POST', 'http://evil.com');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue('https://example.com');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(logger.warn).toHaveBeenCalledWith(
        'CSRF check failed - Origin not allowed',
        'CsrfGuard',
        expect.objectContaining({
          origin: 'http://evil.com',
        })
      );
    });

    it('should block request without Origin/Referer (curl/Postman)', () => {
      const context = createMockContext('POST');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(context)).toThrow('Missing Origin or Referer header');
    });

    it('should block subdomain hijacking attempt', () => {
      const context = createMockContext('POST', 'https://example.com.evil.com');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue('https://example.com');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should block HTTP origin when HTTPS is configured', () => {
      const context = createMockContext('POST', 'http://example.com');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue('https://example.com');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should block port manipulation', () => {
      const context = createMockContext('POST', 'https://example.com:8080');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue('https://example.com');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should block path traversal in origin', () => {
      const context = createMockContext('POST', 'https://example.com/../evil.com');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue('https://example.com');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null origin', () => {
      const context = createMockContext('POST', null);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(context)).toThrow('Missing Origin or Referer header');
    });

    it('should handle undefined origin', () => {
      const context = createMockContext('POST', undefined);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(context)).toThrow('Missing Origin or Referer header');
    });

    it('should handle empty string origin', () => {
      const context = createMockContext('POST', '');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(context)).toThrow('Missing Origin or Referer header');
    });

    it('should handle malformed referer', () => {
      const context = createMockContext('POST', null, '://malformed');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      expect(() => guard.canActivate(context)).toThrow('Missing Origin or Referer header');
    });

    it('should handle special characters in origin', () => {
      const context = createMockContext('POST', 'https://example.com?query=value');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue('https://example.com?query=value');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should escape regex special characters in wildcard pattern', () => {
      const context = createMockContext('POST', 'https://app.example.com');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      // Pattern with regex special chars: . should be escaped
      jest.spyOn(configService, 'get').mockReturnValue('https://*.example.com');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should not match partial domain with wildcard', () => {
      const context = createMockContext('POST', 'https://notexample.com');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue('https://*.example.com');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Integration Scenarios', () => {
    it('should allow webhook endpoints with @SkipCsrf()', () => {
      const context = createMockContext('POST', 'https://external-service.com');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should protect authenticated API endpoints', () => {
      const context = createMockContext('POST', 'https://example.com');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue('https://example.com');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow public GET endpoints without validation', () => {
      const context = createMockContext('GET');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should log all CSRF failures with context', () => {
      const context = createMockContext('POST', 'http://evil.com', null, '/api/users');
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(configService, 'get').mockReturnValue('https://example.com');

      try {
        guard.canActivate(context);
      } catch {
        // Expected error
      }

      expect(logger.warn).toHaveBeenCalledWith(
        'CSRF check failed - Origin not allowed',
        'CsrfGuard',
        expect.objectContaining({
          origin: 'http://evil.com',
          method: 'POST',
          path: '/api/users',
        })
      );
    });
  });
});

/**
 * Helper function to create mock ExecutionContext with HTTP request
 */
function createMockContext(
  method: string,
  origin?: string | null,
  referer?: string | null,
  path: string = '/api/test'
): ExecutionContext {
  const mockRequest = {
    method,
    path,
    headers: {
      ...(origin !== undefined && origin !== null && { origin }),
      ...(referer !== undefined && referer !== null && { referer }),
    },
  };

  return {
    getClass: jest.fn(),
    getHandler: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(mockRequest),
      getResponse: jest.fn(),
      getNext: jest.fn(),
    }),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn().mockReturnValue('http'),
  } as unknown as ExecutionContext;
}
