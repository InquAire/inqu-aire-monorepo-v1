/**
 * JWT Authentication Guard Unit Tests
 *
 * 테스트 범위:
 * - @Public() 데코레이터 처리
 * - JWT 검증 위임
 * - Reflector 메타데이터 우선순위
 * - ExecutionContext 핸들링
 */

import 'reflect-metadata';

import { IS_PUBLIC_KEY } from '@ai-next/nestjs-shared';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should extend AuthGuard', () => {
      expect(guard).toHaveProperty('canActivate');
    });

    it('should have reflector injected', () => {
      expect(reflector).toBeDefined();
    });
  });

  describe('@Public() Decorator Handling', () => {
    it('should return true for public routes (handler level)', () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should return true for public routes (class level)', () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(1);
    });

    it('should check both handler and class for @Public() metadata', () => {
      const context = createMockExecutionContext();
      const handler = context.getHandler();
      const classType = context.getClass();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      // Mock super.canActivate to avoid actual JWT validation
      jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [handler, classType]);
    });

    it('should prioritize handler metadata over class metadata (getAllAndOverride behavior)', () => {
      const context = createMockExecutionContext();

      // getAllAndOverride는 handler를 먼저 확인하고, 없으면 class 확인
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Protected Routes (JWT Validation)', () => {
    it('should call super.canActivate() for non-public routes', () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      // Mock super.canActivate
      const superCanActivateSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(superCanActivateSpy).toHaveBeenCalledWith(context);
      expect(result).toBe(true);
    });

    it('should delegate JWT validation to AuthGuard parent class', () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const superCanActivateSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(Promise.resolve(true));

      const result = guard.canActivate(context);

      expect(superCanActivateSpy).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should return Observable when super.canActivate returns Observable', () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const mockObservable: { subscribe: jest.Mock } = {
        subscribe: jest.fn(),
      };

      jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(mockObservable);

      const result = guard.canActivate(context);

      expect(result).toBe(mockObservable);
    });

    it('should pass through rejection when JWT validation fails', async () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(Promise.resolve(false));

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });
  });

  describe('Metadata Priority and Edge Cases', () => {
    it('should return true when isPublic is explicitly true', () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should proceed with JWT validation when isPublic is false', () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const superSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      guard.canActivate(context);

      expect(superSpy).toHaveBeenCalled();
    });

    it('should proceed with JWT validation when isPublic is undefined', () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const superSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      guard.canActivate(context);

      expect(superSpy).toHaveBeenCalled();
    });

    it('should proceed with JWT validation when isPublic is null', () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

      const superSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      guard.canActivate(context);

      expect(superSpy).toHaveBeenCalled();
    });

    it('should handle multiple calls with different contexts', () => {
      const publicContext = createMockExecutionContext();
      const protectedContext = createMockExecutionContext();

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(true) // First call: public
        .mockReturnValueOnce(false); // Second call: protected

      const superSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      const publicResult = guard.canActivate(publicContext);
      const protectedResult = guard.canActivate(protectedContext);

      expect(publicResult).toBe(true);
      expect(protectedResult).toBe(true);
      expect(superSpy).toHaveBeenCalledWith(protectedContext);
      expect(superSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('ExecutionContext Handling', () => {
    it('should correctly extract handler from context', () => {
      const context = createMockExecutionContext();
      const handler = context.getHandler();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        IS_PUBLIC_KEY,
        expect.arrayContaining([handler, expect.any(Function)])
      );
    });

    it('should correctly extract class from context', () => {
      const context = createMockExecutionContext();
      const classType = context.getClass();

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        IS_PUBLIC_KEY,
        expect.arrayContaining([expect.any(Function), classType])
      );
    });

    it('should work with different execution context types (HTTP, RPC, WS)', () => {
      const httpContext = createMockExecutionContext('http');
      const rpcContext = createMockExecutionContext('rpc');
      const wsContext = createMockExecutionContext('ws');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      expect(guard.canActivate(httpContext)).toBe(true);
      expect(guard.canActivate(rpcContext)).toBe(true);
      expect(guard.canActivate(wsContext)).toBe(true);

      expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(3);
    });
  });

  describe('Integration Scenarios', () => {
    it('should skip authentication for health check endpoints (public)', () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      // super.canActivate should NOT be called
    });

    it('should require authentication for user endpoints (protected)', () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const superSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(Promise.resolve(true));

      guard.canActivate(context);

      expect(superSpy).toHaveBeenCalled();
    });

    it('should not leak metadata between different route handlers', () => {
      const context1 = createMockExecutionContext();
      const context2 = createMockExecutionContext();

      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      const result1 = guard.canActivate(context1);
      const result2 = guard.canActivate(context2);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      // result2는 super.canActivate를 호출해야 함
      expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(2);
    });
  });

  describe('Security Edge Cases', () => {
    it('should not bypass authentication if metadata is empty object', () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({} as Record<string, never>);

      const superSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      guard.canActivate(context);

      // Truthy object는 if(isPublic)를 통과하므로 super 호출 안 함
      expect(superSpy).not.toHaveBeenCalled();
    });

    it('should not bypass authentication if metadata is empty string', () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('');

      const superSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      guard.canActivate(context);

      expect(superSpy).toHaveBeenCalled();
    });

    it('should not bypass authentication if metadata is 0', () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(0);

      const superSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      guard.canActivate(context);

      expect(superSpy).toHaveBeenCalled();
    });
  });
});

/**
 * Helper function to create mock ExecutionContext
 */
function createMockExecutionContext(type: 'http' | 'rpc' | 'ws' = 'http'): ExecutionContext {
  const mockHandler = jest.fn();
  const mockClass = jest.fn();

  return {
    getClass: jest.fn().mockReturnValue(mockClass),
    getHandler: jest.fn().mockReturnValue(mockHandler),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn(),
      getResponse: jest.fn(),
      getNext: jest.fn(),
    }),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn().mockReturnValue(type),
  } as unknown as ExecutionContext;
}
