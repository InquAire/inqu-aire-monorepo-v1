/**
 * SkipCsrf Decorator Unit Tests
 *
 * 테스트 범위:
 * - 메타데이터 설정
 * - 데코레이터 적용
 * - Reflector를 통한 메타데이터 읽기
 */

import 'reflect-metadata';

import { SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SKIP_CSRF_KEY, SkipCsrf } from './skip-csrf.decorator';

// Mock SetMetadata
jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common');
  return {
    ...actual,
    SetMetadata: jest.fn((key: string, value: boolean) => {
      return (target: unknown, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
        // Store metadata for testing
        if (propertyKey && descriptor) {
          Reflect.defineMetadata(key, value, descriptor.value);
        } else {
          Reflect.defineMetadata(key, value, target as object);
        }
        return descriptor || target;
      };
    }),
  };
});

describe('SkipCsrf Decorator', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should export SKIP_CSRF_KEY constant', () => {
      expect(SKIP_CSRF_KEY).toBe('skipCsrf');
    });

    it('should export SkipCsrf decorator function', () => {
      expect(typeof SkipCsrf).toBe('function');
    });

    it('should call SetMetadata with correct key and value', () => {
      // Act
      SkipCsrf();

      // Assert
      expect(SetMetadata).toHaveBeenCalledWith(SKIP_CSRF_KEY, true);
    });
  });

  describe('Decorator Application', () => {
    it('should set metadata on class', () => {
      // Arrange
      @SkipCsrf()
      class TestController {}

      // Act
      const metadata = Reflect.getMetadata(SKIP_CSRF_KEY, TestController);

      // Assert
      expect(metadata).toBe(true);
    });

    it('should set metadata on method', () => {
      // Arrange
      class TestController {
        @SkipCsrf()
        testMethod() {
          return 'test';
        }
      }

      const instance = new TestController();

      // Act
      const metadata = Reflect.getMetadata(SKIP_CSRF_KEY, instance.testMethod);

      // Assert
      expect(metadata).toBe(true);
    });

    it('should allow multiple methods to have SkipCsrf', () => {
      // Arrange
      class TestController {
        @SkipCsrf()
        method1() {
          return 'method1';
        }

        @SkipCsrf()
        method2() {
          return 'method2';
        }

        method3() {
          return 'method3';
        }
      }

      const instance = new TestController();

      // Act & Assert
      expect(Reflect.getMetadata(SKIP_CSRF_KEY, instance.method1)).toBe(true);
      expect(Reflect.getMetadata(SKIP_CSRF_KEY, instance.method2)).toBe(true);
      expect(Reflect.getMetadata(SKIP_CSRF_KEY, instance.method3)).toBeUndefined();
    });
  });

  describe('Reflector Integration', () => {
    it('should be readable by Reflector on class', () => {
      // Arrange
      @SkipCsrf()
      class TestController {}

      // Act
      const metadata = reflector.get<boolean>(SKIP_CSRF_KEY, TestController);

      // Assert
      expect(metadata).toBe(true);
    });

    it('should be readable by Reflector on method', () => {
      // Arrange
      class TestController {
        @SkipCsrf()
        testMethod() {
          return 'test';
        }
      }

      const instance = new TestController();

      // Act
      const metadata = reflector.get<boolean>(SKIP_CSRF_KEY, instance.testMethod);

      // Assert
      expect(metadata).toBe(true);
    });

    it('should return undefined when decorator is not applied', () => {
      // Arrange
      class TestController {
        testMethod() {
          return 'test';
        }
      }

      const instance = new TestController();

      // Act
      const metadata = reflector.get<boolean>(SKIP_CSRF_KEY, instance.testMethod);

      // Assert
      expect(metadata).toBeUndefined();
    });
  });

  describe('Usage Examples', () => {
    it('should work with controller class decorator', () => {
      // Arrange
      @SkipCsrf()
      class WebhookController {
        handleWebhook() {
          return { success: true };
        }
      }

      // Act
      const metadata = Reflect.getMetadata(SKIP_CSRF_KEY, WebhookController);

      // Assert
      expect(metadata).toBe(true);
    });

    it('should work with controller method decorator', () => {
      // Arrange
      class ApiController {
        @SkipCsrf()
        publicEndpoint() {
          return { public: true };
        }

        protectedEndpoint() {
          return { protected: true };
        }
      }

      const instance = new ApiController();

      // Act & Assert
      expect(Reflect.getMetadata(SKIP_CSRF_KEY, instance.publicEndpoint)).toBe(true);
      expect(Reflect.getMetadata(SKIP_CSRF_KEY, instance.protectedEndpoint)).toBeUndefined();
    });

    it('should work with multiple decorators on same method', () => {
      // Arrange
      const PUBLIC_KEY = 'isPublic';

      class TestController {
        @SkipCsrf()
        @SetMetadata(PUBLIC_KEY, true)
        publicMethod() {
          return 'public';
        }
      }

      const instance = new TestController();

      // Act & Assert
      expect(Reflect.getMetadata(SKIP_CSRF_KEY, instance.publicMethod)).toBe(true);
      expect(Reflect.getMetadata(PUBLIC_KEY, instance.publicMethod)).toBe(true);
    });
  });
});
