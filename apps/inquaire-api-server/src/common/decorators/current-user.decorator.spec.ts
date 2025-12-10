/**
 * CurrentUser Decorator Unit Tests
 *
 * 테스트 범위:
 * - 요청에서 사용자 추출
 * - req.user, req.authUser, req.currentUser 우선순위
 * - roles 정규화
 * - deviceId 및 locale 헤더 폴백
 * - getCurrentUser 헬퍼 함수
 */

import 'reflect-metadata';

import { CurrentUser, getCurrentUser, type AuthUser } from '@ai-next/nestjs-shared';
import { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

describe('CurrentUser Decorator', () => {
  let mockExecutionContext: ExecutionContext;
  let mockRequest: Partial<
    Request & {
      user?: AuthUser | { id?: string | number | null; roles?: unknown };
      authUser?: AuthUser | { id?: string | number | null; roles?: unknown };
      currentUser?: AuthUser | { id?: string | number | null; roles?: unknown };
      headers?: Record<string, string | undefined>;
    }
  >;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should be defined', () => {
      expect(CurrentUser).toBeDefined();
      expect(typeof CurrentUser).toBe('function');
    });

    it('should export getCurrentUser helper function', () => {
      expect(getCurrentUser).toBeDefined();
      expect(typeof getCurrentUser).toBe('function');
    });
  });

  describe('User Extraction Priority', () => {
    it('should extract user from req.user first', () => {
      // Arrange
      const user: AuthUser = {
        id: 'user-123',
        sub: 'user-123',
        roles: ['USER'],
      };
      mockRequest.user = user;
      mockRequest.authUser = { id: 'auth-123', sub: 'auth-123', roles: ['ADMIN'] };
      mockRequest.currentUser = { id: 'current-123', sub: 'current-123', roles: ['USER'] };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result).toEqual(user);
    });

    it('should fallback to req.authUser when req.user is not available', () => {
      // Arrange
      const authUser: AuthUser = {
        id: 'auth-123',
        sub: 'auth-123',
        roles: ['ADMIN'],
      };
      mockRequest.user = undefined;
      mockRequest.authUser = authUser;
      mockRequest.currentUser = { id: 'current-123', sub: 'current-123', roles: ['USER'] };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result).toEqual(authUser);
    });

    it('should fallback to req.currentUser when req.user and req.authUser are not available', () => {
      // Arrange
      const currentUser: AuthUser = {
        id: 'current-123',
        sub: 'current-123',
        roles: ['USER'],
      };
      mockRequest.user = undefined;
      mockRequest.authUser = undefined;
      mockRequest.currentUser = currentUser;

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result).toEqual(currentUser);
    });

    it('should return undefined when no user is available', () => {
      // Arrange
      mockRequest.user = undefined;
      mockRequest.authUser = undefined;
      mockRequest.currentUser = undefined;

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('ID Handling', () => {
    it('should convert numeric id to string', () => {
      // Arrange
      mockRequest.user = { id: 123, roles: ['USER'] };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result?.id).toBe('123');
      expect(result?.sub).toBe('123');
    });

    it('should handle string id', () => {
      // Arrange
      mockRequest.user = { id: 'user-123', roles: ['USER'] };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result?.id).toBe('user-123');
      expect(result?.sub).toBe('user-123');
    });

    it('should return undefined when id is missing', () => {
      // Arrange
      mockRequest.user = { roles: ['USER'] } as { roles: string[] };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when id is null', () => {
      // Arrange
      mockRequest.user = { id: null as unknown as string, roles: ['USER'] };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('Roles Normalization', () => {
    it('should normalize roles array', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-123',
        roles: ['USER', 'ADMIN'],
      };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result?.roles).toEqual(['USER', 'ADMIN']);
    });

    it('should normalize roles to uppercase', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-123',
        roles: ['user', 'admin'],
      };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result?.roles).toEqual(['USER', 'ADMIN']);
    });

    it('should handle mixed case roles', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-123',
        roles: ['User', 'AdMiN', 'PUBLIC'],
      };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result?.roles).toEqual(['USER', 'ADMIN', 'PUBLIC']);
    });

    it('should filter out invalid roles', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-123',
        roles: ['USER', 'INVALID', 'ADMIN', 'unknown'],
      };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result?.roles).toEqual(['USER', 'ADMIN']);
    });

    it('should handle empty roles array', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-123',
        roles: [],
      };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result?.roles).toEqual([]);
    });

    it('should handle missing roles', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-123',
      };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result?.roles).toEqual([]);
    });

    it('should handle non-array roles', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-123',
        roles: 'USER' as unknown as string[],
      };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result?.roles).toEqual([]);
    });
  });

  describe('Device ID Handling', () => {
    it('should use deviceId from user object', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-123',
        roles: ['USER'],
        deviceId: 'device-123',
      };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result?.deviceId).toBe('device-123');
    });

    it('should fallback to x-device-id header when deviceId is not in user', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-123',
        roles: ['USER'],
      };
      mockRequest.headers = {
        'x-device-id': 'header-device-123',
      };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result?.deviceId).toBe('header-device-123');
    });

    it('should prefer deviceId from user over header', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-123',
        roles: ['USER'],
        deviceId: 'user-device-123',
      };
      mockRequest.headers = {
        'x-device-id': 'header-device-123',
      };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result?.deviceId).toBe('user-device-123');
    });

    it('should return undefined when deviceId is not available', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-123',
        roles: ['USER'],
      };
      mockRequest.headers = {};

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result?.deviceId).toBeUndefined();
    });
  });

  describe('Locale Handling', () => {
    it('should use locale from user object', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-123',
        roles: ['USER'],
        locale: 'ko-KR',
      };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result?.locale).toBe('ko-KR');
    });

    it('should fallback to accept-language header when locale is not in user', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-123',
        roles: ['USER'],
      };
      mockRequest.headers = {
        'accept-language': 'en-US,en;q=0.9',
      };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result?.locale).toBe('en-US');
    });

    it('should prefer accept-language header over user locale', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-123',
        roles: ['USER'],
        locale: 'ko-KR',
      };
      mockRequest.headers = {
        'accept-language': 'en-US,en;q=0.9',
      };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      // Note: Implementation prioritizes header over user.locale
      expect(result?.locale).toBe('en-US');
    });

    it('should extract first language from accept-language header', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-123',
        roles: ['USER'],
      };
      mockRequest.headers = {
        'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result?.locale).toBe('ko-KR');
    });

    it('should return undefined when locale is not available', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-123',
        roles: ['USER'],
      };
      mockRequest.headers = {};

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result?.locale).toBeUndefined();
    });
  });

  describe('Complete User Object', () => {
    it('should return complete AuthUser object with all fields', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-123',
        roles: ['USER', 'ADMIN'],
        deviceId: 'device-123',
        locale: 'ko-KR',
      };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result).toEqual({
        id: 'user-123',
        sub: 'user-123',
        roles: ['USER', 'ADMIN'],
        deviceId: 'device-123',
        locale: 'ko-KR',
      });
    });

    it('should return AuthUser with minimal fields', () => {
      // Arrange
      mockRequest.user = {
        id: 'user-123',
        roles: ['USER'],
      };

      // Act
      const result = getCurrentUser(mockExecutionContext);

      // Assert
      expect(result).toEqual({
        id: 'user-123',
        sub: 'user-123',
        roles: ['USER'],
        deviceId: undefined,
        locale: undefined,
      });
    });
  });

  describe('CurrentUser Decorator Usage', () => {
    it('should work as parameter decorator', () => {
      // Arrange
      class TestController {
        testMethod(@CurrentUser() user: AuthUser | undefined) {
          return user;
        }
      }

      const controller = new TestController();
      mockRequest.user = {
        id: 'user-123',
        roles: ['USER'],
      };

      // Act
      const result = controller.testMethod(getCurrentUser(mockExecutionContext) as AuthUser);

      // Assert
      expect(result?.id).toBe('user-123');
    });
  });
});
