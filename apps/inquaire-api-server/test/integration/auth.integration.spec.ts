/**
 * Authentication Integration Tests
 *
 * 테스트 범위:
 * - 회원가입 → 로그인 → JWT 검증 → 토큰 재발급
 * - Refresh Token 관리
 * - 로그아웃
 * - 프로필 조회
 *
 * 주의: 이 테스트는 실제 데이터베이스 연결이 필요합니다.
 * 테스트 환경에서는 테스트 전용 데이터베이스를 사용해야 합니다.
 */

import 'reflect-metadata';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn((password: string) => Promise.resolve(`hashed-${password}`)),
  compare: jest.fn((password: string, hash: string) => {
    // Extract original password from hash format "hashed-{password}"
    const originalPassword = hash.replace('hashed-', '');
    return Promise.resolve(password === originalPassword);
  }),
}));

import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';

import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';
import { AuthService } from '@/modules/auth/auth.service';
import { LoginDto } from '@/modules/auth/dto/login.dto';
import { SignupDto } from '@/modules/auth/dto/signup.dto';

describe('Authentication Integration', () => {
  let prismaService: PrismaService | null;
  let authService: AuthService | null;
  let module: TestingModule;
  let isDatabaseAvailable = false;

  // Test data
  const testUsers: string[] = [];
  const testRefreshTokens: string[] = [];

  beforeAll(async () => {
    // 테스트 환경 변수 설정
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL =
      process.env.TEST_DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/inquaire_test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-integration-tests';

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

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'test-jwt-secret',
          signOptions: {
            expiresIn: '15m',
          },
        }),
      ],
      providers: [
        PrismaService,
        AuthService,
        {
          provide: CustomLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);

    // 데이터베이스 연결
    try {
      await prismaService.onModuleInit();
      isDatabaseAvailable = true;
    } catch (error) {
      console.warn(
        'Database connection failed, skipping integration tests. Set TEST_DATABASE_URL to run integration tests.',
        error
      );
      prismaService = null;
      authService = null;
      isDatabaseAvailable = false;
    }
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    if (prismaService && isDatabaseAvailable) {
      try {
        // Refresh Tokens 삭제
        if (testRefreshTokens.length > 0) {
          await prismaService.write.refreshToken.deleteMany({
            where: { lookup_hash: { in: testRefreshTokens } },
          });
        }

        // Users 삭제
        if (testUsers.length > 0) {
          await prismaService.write.user.deleteMany({
            where: { id: { in: testUsers } },
          });
        }

        await prismaService.onModuleDestroy();
      } catch (error) {
        console.warn('Database cleanup error:', error);
      }
    }
    if (module) {
      await module.close();
    }
  });

  describe('Signup', () => {
    it('should create a new user and return tokens', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !authService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const signupDto: SignupDto = {
        email: `test-signup-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Test User',
      };

      // Act
      const result = await authService.signup(signupDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(signupDto.email);
      expect(result.user.name).toBe(signupDto.name);
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.expires_in).toBe(900); // 15 minutes

      // Verify user was created in database
      const user = await prismaService.read.user.findFirst({
        where: { email: signupDto.email },
      });
      expect(user).toBeDefined();
      expect(user?.email).toBe(signupDto.email);
      expect(user?.name).toBe(signupDto.name);
      expect(user?.role).toBe('USER');

      // Verify password is hashed
      expect(user?.password_hash).toBeDefined();
      expect(user?.password_hash).not.toBe(signupDto.password);
      expect(user?.password_hash).toContain('hashed-'); // Mock bcrypt format

      // Store for cleanup
      testUsers.push(user!.id);
    });

    it('should throw error for duplicate email', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !authService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange - Create a user first
      const email = `test-duplicate-${Date.now()}@example.com`;
      const signupDto: SignupDto = {
        email,
        password: 'TestPassword123!',
        name: 'Test User',
      };

      const firstResult = await authService.signup(signupDto);
      testUsers.push(firstResult.user.id);

      // Act & Assert - Try to signup with same email
      await expect(authService.signup(signupDto)).rejects.toThrow('Email already exists');
    });

    it('should create refresh token in database', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !authService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const signupDto: SignupDto = {
        email: `test-refresh-token-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Test User',
      };

      // Act
      const result = await authService.signup(signupDto);
      testUsers.push(result.user.id);

      // Assert - Verify refresh token was stored
      const refreshTokens = await prismaService.read.refreshToken.findMany({
        where: { user_id: result.user.id },
      });

      expect(refreshTokens.length).toBeGreaterThan(0);
      expect(refreshTokens[0]?.expires_at).toBeDefined();
      expect(refreshTokens[0]?.expires_at!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Login', () => {
    let testEmail: string;
    let testPassword: string;
    let testUserId: string;

    beforeAll(async () => {
      if (isDatabaseAvailable && prismaService && authService) {
        // Create a test user for login tests
        testEmail = `test-login-${Date.now()}@example.com`;
        testPassword = 'TestPassword123!';
        const signupDto: SignupDto = {
          email: testEmail,
          password: testPassword,
          name: 'Test Login User',
        };
        const result = await authService.signup(signupDto);
        testUserId = result.user.id;
        testUsers.push(testUserId);
      }
    });

    it('should login with valid credentials', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !authService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const loginDto: LoginDto = {
        email: testEmail,
        password: testPassword,
      };

      // Act
      const result = await authService.login(loginDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testEmail);
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.expires_in).toBe(900);
    });

    it('should throw error for invalid email', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !authService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const loginDto: LoginDto = {
        email: 'non-existent@example.com',
        password: 'TestPassword123!',
      };

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for invalid password', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !authService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const loginDto: LoginDto = {
        email: testEmail,
        password: 'WrongPassword123!',
      };

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should update last_login_at on successful login', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !authService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const loginDto: LoginDto = {
        email: testEmail,
        password: testPassword,
      };

      // Get initial last_login_at
      const userBefore = await prismaService.read.user.findFirst({
        where: { id: testUserId },
      });
      const initialLastLogin = userBefore?.last_login_at;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      // Act
      await authService.login(loginDto);

      // Assert
      const userAfter = await prismaService.read.user.findFirst({
        where: { id: testUserId },
      });

      expect(userAfter?.last_login_at).toBeDefined();
      if (initialLastLogin && userAfter?.last_login_at) {
        expect(userAfter.last_login_at.getTime()).toBeGreaterThan(initialLastLogin.getTime());
      }
    });
  });

  describe('Token Refresh', () => {
    let refreshToken: string;
    let userId: string;

    beforeAll(async () => {
      if (isDatabaseAvailable && prismaService && authService) {
        // Create a user and get refresh token
        const signupDto: SignupDto = {
          email: `test-refresh-${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Test Refresh User',
        };
        const result = await authService.signup(signupDto);
        refreshToken = result.refresh_token;
        userId = result.user.id;
        testUsers.push(userId);
      }
    });

    it('should refresh access token with valid refresh token', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !authService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Act
      const result = await authService.refreshAccessToken(refreshToken);

      // Assert
      expect(result).toBeDefined();
      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.expires_in).toBe(900);
    });

    it('should throw error for invalid refresh token', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !authService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const invalidToken = 'invalid-refresh-token-12345';

      // Act & Assert
      await expect(authService.refreshAccessToken(invalidToken)).rejects.toThrow();
    });

    it('should throw error for expired refresh token', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !authService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange - Create a refresh token and manually expire it
      const signupDto: SignupDto = {
        email: `test-expired-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Test Expired User',
      };
      const signupResult = await authService.signup(signupDto);
      testUsers.push(signupResult.user.id);

      // Manually expire the token
      await prismaService.write.refreshToken.updateMany({
        where: { user_id: signupResult.user.id },
        data: {
          expires_at: new Date(Date.now() - 1000), // 1 second ago
        },
      });

      // Act & Assert
      await expect(authService.refreshAccessToken(signupResult.refresh_token)).rejects.toThrow();
    });

    it('should throw error for revoked refresh token', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !authService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange - Create a refresh token and manually revoke it
      const signupDto: SignupDto = {
        email: `test-revoked-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Test Revoked User',
      };
      const signupResult = await authService.signup(signupDto);
      testUsers.push(signupResult.user.id);

      // Manually revoke the token
      await prismaService.write.refreshToken.updateMany({
        where: { user_id: signupResult.user.id },
        data: {
          revoked_at: new Date(),
        },
      });

      // Act & Assert
      await expect(authService.refreshAccessToken(signupResult.refresh_token)).rejects.toThrow();
    });
  });

  describe('Logout', () => {
    it('should revoke refresh token on logout', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !authService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange - Create a user and get refresh token
      const signupDto: SignupDto = {
        email: `test-logout-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Test Logout User',
      };
      const signupResult = await authService.signup(signupDto);
      testUsers.push(signupResult.user.id);

      // Act
      await authService.logout(signupResult.refresh_token);

      // Assert - Verify token is deleted (logout deletes the token)
      const refreshTokens = await prismaService.read.refreshToken.findMany({
        where: { user_id: signupResult.user.id },
      });

      expect(refreshTokens.length).toBe(0);

      // Verify token cannot be used for refresh
      await expect(authService.refreshAccessToken(signupResult.refresh_token)).rejects.toThrow();
    });

    it('should handle logout with invalid token gracefully', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !authService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const invalidToken = 'invalid-token-12345';

      // Act & Assert - Should throw error for invalid token
      await expect(authService.logout(invalidToken)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('Get Profile', () => {
    let testUserId: string;

    beforeAll(async () => {
      if (isDatabaseAvailable && prismaService && authService) {
        // Create a test user for profile tests
        const signupDto: SignupDto = {
          email: `test-profile-${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Test Profile User',
        };
        const result = await authService.signup(signupDto);
        testUserId = result.user.id;
        testUsers.push(testUserId);
      }
    });

    it('should return user profile', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !authService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Act
      const profile = await authService.getProfile(testUserId);

      // Assert
      expect(profile).toBeDefined();
      expect(profile.id).toBe(testUserId);
      expect(profile.email).toBeDefined();
      expect(profile.name).toBeDefined();
      expect(profile.role).toBeDefined();
    });

    it('should throw error for non-existent user', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !authService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Act & Assert
      await expect(authService.getProfile('non-existent-id')).rejects.toThrow('User not found');
    });
  });

  describe('JWT Token Validation', () => {
    it('should generate valid JWT token', async () => {
      // Skip if database is not available
      if (!isDatabaseAvailable || !prismaService || !authService) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Arrange
      const signupDto: SignupDto = {
        email: `test-jwt-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Test JWT User',
      };

      // Act
      const result = await authService.signup(signupDto);
      testUsers.push(result.user.id);

      // Assert - Verify JWT token structure
      expect(result.access_token).toBeDefined();
      expect(typeof result.access_token).toBe('string');
      expect(result.access_token.split('.')).toHaveLength(3); // JWT has 3 parts

      // Verify token payload can be decoded (basic check)
      const parts = result.access_token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1]!, 'base64').toString());
      expect(payload.sub).toBe(result.user.id);
      expect(payload.email).toBe(result.user.email);
      expect(payload.role).toBe(result.user.role);
    });
  });
});
