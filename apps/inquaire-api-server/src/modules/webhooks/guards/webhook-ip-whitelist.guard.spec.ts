/**
 * Webhook IP Whitelist Guard Unit Tests
 *
 * 테스트 범위:
 * - Kakao/LINE IP 화이트리스트 검증
 * - CIDR 범위 매칭 (bit mask)
 * - 플랫폼 감지 (URL 기반)
 * - IP 추출 (X-Forwarded-For, X-Real-IP, socket)
 * - 개발 환경 스킵
 * - IPv4 형식 검증
 * - 보안 공격 시나리오
 */

import 'reflect-metadata';

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { CustomLoggerService } from '../../../common/modules/logger/logger.service';

import { WebhookIpWhitelistGuard } from './webhook-ip-whitelist.guard';

describe('WebhookIpWhitelistGuard', () => {
  let guard: WebhookIpWhitelistGuard;
  let configService: ConfigService;
  let logger: CustomLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookIpWhitelistGuard,
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
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<WebhookIpWhitelistGuard>(WebhookIpWhitelistGuard);
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
      expect(configService).toBeDefined();
      expect(logger).toBeDefined();
    });
  });

  describe('Development Mode Bypass', () => {
    it('should allow all requests in development mode', () => {
      const context = createMockContext('1.2.3.4', '/webhooks/kakao/test');
      jest.spyOn(configService, 'get').mockReturnValue('development');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(logger.log).toHaveBeenCalledWith(
        'Development mode - IP whitelist check skipped for 1.2.3.4'
      );
    });

    it('should allow requests from any IP in development', () => {
      const context = createMockContext('192.168.1.1', '/webhooks/kakao/test');
      jest.spyOn(configService, 'get').mockReturnValue('development');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should enforce whitelist in production mode', () => {
      const context = createMockContext('1.2.3.4', '/webhooks/kakao/test');
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'WEBHOOK_IP_WHITELIST_ENABLED') return 'true';
        return defaultValue;
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Whitelist Enabled/Disabled', () => {
    it('should allow all requests when whitelist is disabled', () => {
      const context = createMockContext('1.2.3.4', '/webhooks/kakao/test');
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'WEBHOOK_IP_WHITELIST_ENABLED') return 'false';
        return defaultValue;
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith('IP whitelist is disabled via environment variable');
    });

    it('should enforce whitelist when explicitly enabled', () => {
      const context = createMockContext('1.2.3.4', '/webhooks/kakao/test');
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'WEBHOOK_IP_WHITELIST_ENABLED') return 'true';
        return defaultValue;
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should enforce whitelist by default (when env var is not set)', () => {
      const context = createMockContext('1.2.3.4', '/webhooks/kakao/test');
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'NODE_ENV') return 'production';
        return defaultValue;
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Kakao IP Whitelist', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'WEBHOOK_IP_WHITELIST_ENABLED') return 'true';
        return defaultValue;
      });
    });

    it('should allow Kakao IP range 1 (110.76.141.0/24)', () => {
      const context = createMockContext('110.76.141.100', '/webhooks/kakao/channel123');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(logger.log).toHaveBeenCalledWith(
        'Webhook IP verified: 110.76.141.100 (KAKAO)',
        'WebhookIpWhitelistGuard'
      );
    });

    it('should allow Kakao IP range 2 (211.231.99.0/24)', () => {
      const context = createMockContext('211.231.99.50', '/webhooks/kakao/channel456');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow first IP in Kakao range 1', () => {
      const context = createMockContext('110.76.141.0', '/webhooks/kakao/test');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow last IP in Kakao range 1', () => {
      const context = createMockContext('110.76.141.255', '/webhooks/kakao/test');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should reject IP outside Kakao range', () => {
      const context = createMockContext('110.76.142.1', '/webhooks/kakao/test');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Webhook access denied - IP not whitelisted: 110.76.142.1'
      );
    });

    it('should reject random IP for Kakao webhook', () => {
      const context = createMockContext('1.2.3.4', '/webhooks/kakao/test');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should detect KAKAO platform from URL', () => {
      const context = createMockContext('110.76.141.1', '/webhooks/kakao/channel/123');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle different Kakao webhook paths', () => {
      const paths = [
        '/webhooks/kakao/test',
        '/webhooks/kakao/channel123',
        '/webhooks/kakao/message',
      ];

      paths.forEach(path => {
        const context = createMockContext('110.76.141.1', path);
        expect(guard.canActivate(context)).toBe(true);
      });
    });
  });

  describe('LINE IP Whitelist', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'WEBHOOK_IP_WHITELIST_ENABLED') return 'true';
        return defaultValue;
      });
    });

    it('should allow LINE IP range (147.92.128.0/17)', () => {
      const context = createMockContext('147.92.150.1', '/webhooks/line/callback');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(logger.log).toHaveBeenCalledWith(
        'Webhook IP verified: 147.92.150.1 (LINE)',
        'WebhookIpWhitelistGuard'
      );
    });

    it('should allow first IP in LINE range', () => {
      const context = createMockContext('147.92.128.0', '/webhooks/line/test');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow last IP in LINE range (147.92.255.255)', () => {
      const context = createMockContext('147.92.255.255', '/webhooks/line/test');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should reject IP outside LINE range', () => {
      const context = createMockContext('147.93.0.1', '/webhooks/line/test');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should reject random IP for LINE webhook', () => {
      const context = createMockContext('1.2.3.4', '/webhooks/line/test');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should detect LINE platform from URL', () => {
      const context = createMockContext('147.92.150.1', '/webhooks/line/callback/123');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('CIDR Range Calculation', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'WEBHOOK_IP_WHITELIST_ENABLED') return 'true';
        return defaultValue;
      });
    });

    it('should correctly match /24 CIDR (256 IPs)', () => {
      // 110.76.141.0/24 includes 110.76.141.0 to 110.76.141.255
      const validIps = ['110.76.141.0', '110.76.141.128', '110.76.141.255'];
      const invalidIps = ['110.76.140.255', '110.76.142.0'];

      validIps.forEach(ip => {
        const context = createMockContext(ip, '/webhooks/kakao/test');
        expect(guard.canActivate(context)).toBe(true);
      });

      invalidIps.forEach(ip => {
        const context = createMockContext(ip, '/webhooks/kakao/test');
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      });
    });

    it('should correctly match /17 CIDR (32768 IPs)', () => {
      // 147.92.128.0/17 includes 147.92.128.0 to 147.92.255.255
      const validIps = ['147.92.128.0', '147.92.192.1', '147.92.255.255'];
      const invalidIps = ['147.92.127.255', '147.93.0.0'];

      validIps.forEach(ip => {
        const context = createMockContext(ip, '/webhooks/line/test');
        expect(guard.canActivate(context)).toBe(true);
      });

      invalidIps.forEach(ip => {
        const context = createMockContext(ip, '/webhooks/line/test');
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      });
    });

    it('should handle boundary IPs correctly', () => {
      // Test exact boundaries of /24 range
      const context1 = createMockContext('110.76.141.0', '/webhooks/kakao/test');
      const context2 = createMockContext('110.76.141.255', '/webhooks/kakao/test');

      expect(guard.canActivate(context1)).toBe(true);
      expect(guard.canActivate(context2)).toBe(true);
    });
  });

  describe('IP Address Extraction', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'WEBHOOK_IP_WHITELIST_ENABLED') return 'true';
        return defaultValue;
      });
    });

    it('should extract IP from X-Forwarded-For header (highest priority)', () => {
      const context = createMockContext(
        '110.76.141.1',
        '/webhooks/kakao/test',
        {
          'x-forwarded-for': '110.76.141.100, 192.168.1.1',
        },
        '127.0.0.1'
      );

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should extract IP from X-Real-IP header (second priority)', () => {
      const context = createMockContext(
        '110.76.141.1',
        '/webhooks/kakao/test',
        {
          'x-real-ip': '110.76.141.100',
        },
        '127.0.0.1'
      );

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should extract IP from socket.remoteAddress (fallback)', () => {
      const context = createMockContext(
        '110.76.141.1',
        '/webhooks/kakao/test',
        {},
        '110.76.141.100'
      );

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should trim whitespace from X-Forwarded-For IP', () => {
      const context = createMockContext(
        '110.76.141.1',
        '/webhooks/kakao/test',
        {
          'x-forwarded-for': '  110.76.141.100  , 192.168.1.1',
        },
        '127.0.0.1'
      );

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle single IP in X-Forwarded-For', () => {
      const context = createMockContext(
        '110.76.141.1',
        '/webhooks/kakao/test',
        {
          'x-forwarded-for': '110.76.141.100',
        },
        '127.0.0.1'
      );

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle X-Forwarded-For as array', () => {
      const context = createMockContext(
        '110.76.141.1',
        '/webhooks/kakao/test',
        {
          'x-forwarded-for': ['110.76.141.100', '192.168.1.1'],
        },
        '127.0.0.1'
      );

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Platform Detection', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'WEBHOOK_IP_WHITELIST_ENABLED') return 'true';
        return defaultValue;
      });
    });

    it('should detect KAKAO from URL path', () => {
      const context = createMockContext('110.76.141.1', '/webhooks/kakao/test');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should detect LINE from URL path', () => {
      const context = createMockContext('147.92.150.1', '/webhooks/line/callback');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should reject UNKNOWN platform', () => {
      const context = createMockContext('110.76.141.1', '/webhooks/other/test');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should not allow LINE IP for Kakao webhook', () => {
      const context = createMockContext('147.92.150.1', '/webhooks/kakao/test');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should not allow Kakao IP for LINE webhook', () => {
      const context = createMockContext('110.76.141.1', '/webhooks/line/test');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('IPv4 Validation', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'WEBHOOK_IP_WHITELIST_ENABLED') return 'true';
        return defaultValue;
      });
    });

    it('should reject invalid IPv4 format', () => {
      const invalidIps = ['not-an-ip', '256.1.1.1', '1.2.3', '1.2.3.4.5', '1.2.3.256', '1.2.-3.4'];

      invalidIps.forEach(ip => {
        const context = createMockContext(ip, '/webhooks/kakao/test', {}, ip);
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      });
    });

    it('should accept valid IPv4 format', () => {
      const context = createMockContext('110.76.141.1', '/webhooks/kakao/test', {}, '110.76.141.1');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle IPv4 with leading zeros', () => {
      // Note: This depends on implementation - some parsers reject leading zeros
      const context = createMockContext(
        '110.76.141.001',
        '/webhooks/kakao/test',
        {},
        '110.76.141.001'
      );

      // The regex should accept this as valid
      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('Security Scenarios', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'WEBHOOK_IP_WHITELIST_ENABLED') return 'true';
        return defaultValue;
      });
    });

    it('should block spoofed IP attempt', () => {
      const context = createMockContext('1.2.3.4', '/webhooks/kakao/test');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(logger.warn).toHaveBeenCalledWith(
        'Webhook request blocked - IP not whitelisted',
        'WebhookIpWhitelistGuard',
        expect.objectContaining({
          clientIp: '1.2.3.4',
          platform: 'KAKAO',
        })
      );
    });

    it('should block attacker IP claiming to be Kakao', () => {
      const context = createMockContext('192.168.1.100', '/webhooks/kakao/test');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should block IP with valid format but wrong range', () => {
      const context = createMockContext('110.76.140.1', '/webhooks/kakao/test');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should reject localhost for production webhook', () => {
      const context = createMockContext('127.0.0.1', '/webhooks/kakao/test');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should reject private IP ranges', () => {
      const privateIps = ['192.168.1.1', '10.0.0.1', '172.16.0.1'];

      privateIps.forEach(ip => {
        const context = createMockContext(ip, '/webhooks/kakao/test');
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      });
    });

    it('should handle unknown remote address gracefully', () => {
      const context = createMockContext('unknown', '/webhooks/kakao/test', {}, 'unknown');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'WEBHOOK_IP_WHITELIST_ENABLED') return 'true';
        return defaultValue;
      });
    });

    it('should handle URL with query parameters', () => {
      const context = createMockContext('110.76.141.1', '/webhooks/kakao/test?param=value&foo=bar');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle URL with hash fragment', () => {
      const context = createMockContext('110.76.141.1', '/webhooks/kakao/test#fragment');

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should be case-sensitive for platform detection', () => {
      // Uppercase KAKAO should not match
      const context = createMockContext('110.76.141.1', '/webhooks/KAKAO/test');

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should reject malformed URL with multiple forward slashes', () => {
      const context = createMockContext('110.76.141.1', '/webhooks//kakao//test');

      // Multiple slashes don't match the pattern, so platform is UNKNOWN
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});

/**
 * Helper function to create mock ExecutionContext
 */
function createMockContext(
  socketIp: string,
  url: string,
  headers: Record<string, string | string[]> = {},
  remoteAddress?: string
): ExecutionContext {
  const mockRequest = {
    url,
    headers,
    socket: {
      remoteAddress: remoteAddress || socketIp,
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
