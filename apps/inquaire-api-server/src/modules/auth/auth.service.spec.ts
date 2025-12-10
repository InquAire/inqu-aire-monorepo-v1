/**
 * AuthService Unit Tests
 *
 * 테스트 범위:
 * - 회원가입 (signup)
 * - 로그인 (login)
 * - JWT 토큰 생성 (generateTokens)
 * - Refresh Token으로 Access Token 재발급
 * - 로그아웃
 * - 사용자 프로필 조회
 * - JWT 페이로드 검증
 * - 보안: bcrypt 해싱, O(1) lookup 최적화
 */

import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Import mocked bcrypt

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    read: {
      user: { findUnique: jest.Mock; findFirst: jest.Mock };
      refreshToken: { findUnique: jest.Mock; findFirst: jest.Mock };
    };
    write: {
      user: { create: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
      refreshToken: { create: jest.Mock; delete: jest.Mock };
    };
  };
  let jwtService: jest.Mocked<JwtService>;
  let logger: jest.Mocked<CustomLoggerService>;

  // Test data
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password_hash: '$2b$10$hashedpassword',
    role: 'USER',
    created_at: new Date('2025-01-01'),
    last_login_at: new Date('2025-01-10'),
    deleted_at: null,
  };

  const mockRefreshToken = {
    id: 'token-123',
    user_id: 'user-123',
    token_hash: '$2b$10$hashedrefreshtoken',
    lookup_hash: 'sha256lookuphash',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    revoked_at: null,
    created_at: new Date(),
    user: mockUser,
  };

  beforeEach(async () => {
    // Create mock implementations
    const mockPrismaService = {
      read: {
        user: {
          findUnique: jest.fn(),
          findFirst: jest.fn(),
        },
        refreshToken: {
          findUnique: jest.fn(),
          findFirst: jest.fn(),
        },
      },
      write: {
        user: {
          create: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
        },
        refreshToken: {
          create: jest.fn(),
          delete: jest.fn(),
        },
      },
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      logBusinessEvent: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: CustomLoggerService, useValue: mockLogger },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
    logger = module.get(CustomLoggerService);

    // findFirst와 findUnique가 같은 mock을 사용하도록 설정
    prisma.read.user.findFirst = prisma.read.user.findUnique;
    prisma.read.refreshToken.findFirst = prisma.read.refreshToken.findUnique;
    prisma.write.user.updateMany = prisma.write.user.update;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    const signupDto: SignupDto = {
      email: 'newuser@example.com',
      password: 'StrongPassword123!',
      name: 'New User',
    };

    it('should successfully register a new user', async () => {
      // Arrange
      prisma.read.user.findUnique.mockResolvedValue(null); // No existing user
      prisma.write.user.create.mockResolvedValue({
        ...mockUser,
        email: signupDto.email,
        name: signupDto.name,
      });
      jwtService.sign.mockReturnValue('mock-access-token');
      prisma.write.refreshToken.create.mockResolvedValue(mockRefreshToken);

      // Act
      const result = await service.signup(signupDto);

      // Assert
      expect(prisma.read.user.findUnique).toHaveBeenCalledWith({
        where: { email: signupDto.email },
      });
      expect(prisma.write.user.create).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.user.email).toBe(signupDto.email);
      expect(logger.logBusinessEvent).toHaveBeenCalledWith('user_registered', expect.any(Object));
    });

    it('should hash password with bcrypt (10 rounds)', async () => {
      // Arrange
      prisma.read.user.findUnique.mockResolvedValue(null);
      const bcryptHashSpy = jest.spyOn(bcrypt, 'hash');
      bcryptHashSpy.mockResolvedValue('$2b$10$hashedpassword' as never);
      jwtService.sign.mockReturnValue('mock-access-token');
      prisma.write.user.create.mockResolvedValue(mockUser);
      prisma.write.refreshToken.create.mockResolvedValue(mockRefreshToken);

      // Act
      await service.signup(signupDto);

      // Assert
      expect(bcryptHashSpy).toHaveBeenCalledWith(signupDto.password, 10);
      bcryptHashSpy.mockRestore();
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      prisma.read.user.findUnique.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.signup(signupDto)).rejects.toThrow(ConflictException);
      await expect(service.signup(signupDto)).rejects.toThrow('Email already exists');
    });

    it('should set user role to USER by default', async () => {
      // Arrange
      prisma.read.user.findUnique.mockResolvedValue(null);
      jwtService.sign.mockReturnValue('mock-access-token');
      prisma.write.user.create.mockResolvedValue(mockUser);
      prisma.write.refreshToken.create.mockResolvedValue(mockRefreshToken);

      // Act
      await service.signup(signupDto);

      // Assert
      expect(prisma.write.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: 'USER',
        }),
        select: expect.any(Object),
      });
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'correctpassword',
    };

    it('should successfully log in with valid credentials', async () => {
      // Arrange
      prisma.read.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      prisma.write.user.update.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock-access-token');
      prisma.write.refreshToken.create.mockResolvedValue(mockRefreshToken);

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(prisma.read.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password_hash);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(logger.logBusinessEvent).toHaveBeenCalledWith('user_login', expect.any(Object));
    });

    it('should update last_login_at on successful login', async () => {
      // Arrange
      prisma.read.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      prisma.write.user.update.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock-access-token');
      prisma.write.refreshToken.create.mockResolvedValue(mockRefreshToken);

      // Act
      await service.login(loginDto);

      // Assert
      expect(prisma.write.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { last_login_at: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      prisma.read.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException if user is deleted', async () => {
      // Arrange
      const deletedUser = { ...mockUser, deleted_at: new Date() };
      prisma.read.user.findUnique.mockResolvedValue(deletedUser);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      // Arrange
      prisma.read.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('generateTokens', () => {
    it('should generate access token and refresh token', async () => {
      // Arrange
      jwtService.sign.mockReturnValue('mock-access-token');
      prisma.write.refreshToken.create.mockResolvedValue(mockRefreshToken);

      // Act
      const result = await service.generateTokens(mockUser.id, mockUser.email, mockUser.role);

      // Assert
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('expires_in');
      expect(result.expires_in).toBe(900); // 15 minutes in seconds
    });

    it('should sign JWT with correct payload and expiry', async () => {
      // Arrange
      jwtService.sign.mockReturnValue('mock-access-token');
      prisma.write.refreshToken.create.mockResolvedValue(mockRefreshToken);

      // Act
      await service.generateTokens(mockUser.id, mockUser.email, mockUser.role);

      // Assert
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          sub: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        },
        { expiresIn: '15m' }
      );
    });

    it('should store refresh token with dual hashing (bcrypt + SHA-256)', async () => {
      // Arrange
      jwtService.sign.mockReturnValue('mock-access-token');
      const bcryptHashSpy = jest.spyOn(bcrypt, 'hash');
      bcryptHashSpy.mockResolvedValue('$2b$10$hashedrefreshtoken' as never);
      prisma.write.refreshToken.create.mockResolvedValue(mockRefreshToken);

      // Act
      await service.generateTokens(mockUser.id, mockUser.email, mockUser.role);

      // Assert
      // bcrypt hash for security
      expect(bcryptHashSpy).toHaveBeenCalled();

      // Refresh token creation with both hashes
      expect(prisma.write.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: mockUser.id,
          token_hash: expect.any(String), // bcrypt hash
          lookup_hash: expect.any(String), // SHA-256 hash
          expires_at: expect.any(Date),
        }),
      });

      bcryptHashSpy.mockRestore();
    });

    it('should set refresh token expiry to 7 days', async () => {
      // Arrange
      jwtService.sign.mockReturnValue('mock-access-token');
      prisma.write.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const nowBefore = Date.now();

      // Act
      await service.generateTokens(mockUser.id, mockUser.email, mockUser.role);

      const nowAfter = Date.now();

      // Assert
      expect(prisma.write.refreshToken.create).toHaveBeenCalled();
      const createCall = (prisma.write.refreshToken.create as jest.Mock).mock.calls[0][0];
      const expiresAt = createCall.data.expires_at;

      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const expectedExpiry = nowBefore + sevenDays;
      const expiryTime = expiresAt.getTime();

      // Allow 1 second tolerance
      expect(expiryTime).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(expiryTime).toBeLessThanOrEqual(nowAfter + sevenDays + 1000);
    });
  });

  describe('refreshAccessToken', () => {
    const refreshToken = 'valid-refresh-token-uuid';

    it('should successfully refresh access token with valid refresh token', async () => {
      // Arrange
      prisma.read.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('new-access-token');
      prisma.write.refreshToken.create.mockResolvedValue(mockRefreshToken);
      prisma.write.refreshToken.delete.mockResolvedValue(mockRefreshToken);

      // Act
      const result = await service.refreshAccessToken(refreshToken);

      // Assert
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(prisma.write.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: mockRefreshToken.id },
      });
    });

    it('should use O(1) lookup with SHA-256 hash', async () => {
      // Arrange
      prisma.read.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('new-access-token');
      prisma.write.refreshToken.create.mockResolvedValue(mockRefreshToken);
      prisma.write.refreshToken.delete.mockResolvedValue(mockRefreshToken);

      // Act
      await service.refreshAccessToken(refreshToken);

      // Assert
      expect(prisma.read.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { lookup_hash: expect.any(String) }, // SHA-256 hash
        include: { user: true },
      });
    });

    it('should perform bcrypt verification after lookup (2-layer security)', async () => {
      // Arrange
      const bcryptCompareSpy = jest.spyOn(bcrypt, 'compare');
      bcryptCompareSpy.mockResolvedValue(true as never);
      prisma.read.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      jwtService.sign.mockReturnValue('new-access-token');
      prisma.write.refreshToken.create.mockResolvedValue(mockRefreshToken);
      prisma.write.refreshToken.delete.mockResolvedValue(mockRefreshToken);

      // Act
      await service.refreshAccessToken(refreshToken);

      // Assert
      expect(bcryptCompareSpy).toHaveBeenCalledWith(refreshToken, mockRefreshToken.token_hash);
      bcryptCompareSpy.mockRestore();
    });

    it('should throw UnauthorizedException if token not found', async () => {
      // Arrange
      prisma.read.refreshToken.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should throw UnauthorizedException if token is expired', async () => {
      // Arrange
      const expiredToken = {
        ...mockRefreshToken,
        expires_at: new Date(Date.now() - 1000), // Expired
      };
      prisma.read.refreshToken.findUnique.mockResolvedValue(expiredToken);

      // Act & Assert
      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(
        'Refresh token expired'
      );
    });

    it('should throw UnauthorizedException if token is revoked', async () => {
      // Arrange
      const revokedToken = {
        ...mockRefreshToken,
        revoked_at: new Date(),
      };
      prisma.read.refreshToken.findUnique.mockResolvedValue(revokedToken);

      // Act & Assert
      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(
        'Refresh token revoked'
      );
    });

    it('should throw UnauthorizedException if bcrypt verification fails (hash collision)', async () => {
      // Arrange
      prisma.read.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never); // bcrypt fails

      // Act & Assert
      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(UnauthorizedException);
      expect(logger.warn).toHaveBeenCalledWith(
        'Lookup hash matched but bcrypt failed - possible hash collision',
        'AuthService'
      );
    });

    it('should throw UnauthorizedException if user is deleted', async () => {
      // Arrange
      const tokenWithDeletedUser = {
        ...mockRefreshToken,
        user: { ...mockUser, deleted_at: new Date() },
      };
      prisma.read.refreshToken.findUnique.mockResolvedValue(tokenWithDeletedUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      // Act & Assert
      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshAccessToken(refreshToken)).rejects.toThrow('User not found');
    });

    it('should delete old refresh token after issuing new one', async () => {
      // Arrange
      prisma.read.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.sign.mockReturnValue('new-access-token');
      prisma.write.refreshToken.create.mockResolvedValue(mockRefreshToken);
      prisma.write.refreshToken.delete.mockResolvedValue(mockRefreshToken);

      // Act
      await service.refreshAccessToken(refreshToken);

      // Assert
      expect(prisma.write.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: mockRefreshToken.id },
      });
    });
  });

  describe('logout', () => {
    const refreshToken = 'valid-refresh-token';

    it('should successfully logout and delete refresh token', async () => {
      // Arrange
      prisma.read.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      prisma.write.refreshToken.delete.mockResolvedValue(mockRefreshToken);

      // Act
      const result = await service.logout(refreshToken);

      // Assert
      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(prisma.write.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: mockRefreshToken.id },
      });
      expect(logger.logBusinessEvent).toHaveBeenCalledWith('user_logout', expect.any(Object));
    });

    it('should use O(1) lookup with SHA-256 hash', async () => {
      // Arrange
      prisma.read.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      prisma.write.refreshToken.delete.mockResolvedValue(mockRefreshToken);

      // Act
      await service.logout(refreshToken);

      // Assert
      expect(prisma.read.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { lookup_hash: expect.any(String) },
      });
    });

    it('should verify token with bcrypt', async () => {
      // Arrange
      const bcryptCompareSpy = jest.spyOn(bcrypt, 'compare');
      bcryptCompareSpy.mockResolvedValue(true as never);
      prisma.read.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      prisma.write.refreshToken.delete.mockResolvedValue(mockRefreshToken);

      // Act
      await service.logout(refreshToken);

      // Assert
      expect(bcryptCompareSpy).toHaveBeenCalledWith(refreshToken, mockRefreshToken.token_hash);
      bcryptCompareSpy.mockRestore();
    });

    it('should throw BadRequestException if token not found', async () => {
      // Arrange
      prisma.read.refreshToken.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.logout(refreshToken)).rejects.toThrow(BadRequestException);
      await expect(service.logout(refreshToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should throw BadRequestException if bcrypt verification fails', async () => {
      // Arrange
      prisma.read.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      // Act & Assert
      await expect(service.logout(refreshToken)).rejects.toThrow(BadRequestException);
      await expect(service.logout(refreshToken)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('getProfile', () => {
    it('should successfully get user profile', async () => {
      // Arrange
      prisma.read.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.getProfile(mockUser.id);

      // Assert
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        created_at: mockUser.created_at,
        last_login_at: mockUser.last_login_at,
      });
      expect(prisma.read.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: expect.any(Object),
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      prisma.read.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getProfile('non-existent-id')).rejects.toThrow(UnauthorizedException);
      await expect(service.getProfile('non-existent-id')).rejects.toThrow('User not found');
    });

    it('should throw UnauthorizedException if user is deleted', async () => {
      // Arrange
      const deletedUser = { ...mockUser, deleted_at: new Date() };
      prisma.read.user.findUnique.mockResolvedValue(deletedUser);

      // Act & Assert
      await expect(service.getProfile(mockUser.id)).rejects.toThrow(UnauthorizedException);
      await expect(service.getProfile(mockUser.id)).rejects.toThrow('User not found');
    });
  });

  describe('validateUser', () => {
    const jwtPayload = {
      sub: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
    };

    it('should successfully validate user from JWT payload', async () => {
      // Arrange
      prisma.read.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateUser(jwtPayload);

      // Assert
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(prisma.read.user.findUnique).toHaveBeenCalledWith({
        where: { id: jwtPayload.sub },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      prisma.read.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.validateUser(jwtPayload)).rejects.toThrow(UnauthorizedException);
      await expect(service.validateUser(jwtPayload)).rejects.toThrow('User not found');
    });

    it('should throw UnauthorizedException if user is deleted', async () => {
      // Arrange
      const deletedUser = { ...mockUser, deleted_at: new Date() };
      prisma.read.user.findUnique.mockResolvedValue(deletedUser);

      // Act & Assert
      await expect(service.validateUser(jwtPayload)).rejects.toThrow(UnauthorizedException);
      await expect(service.validateUser(jwtPayload)).rejects.toThrow('User not found');
    });
  });

  describe('Security & Edge Cases', () => {
    it('should use bcrypt with 10 rounds for password hashing', async () => {
      const signupDto: SignupDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test',
      };

      prisma.read.user.findUnique.mockResolvedValue(null);
      const bcryptHashSpy = jest.spyOn(bcrypt, 'hash');
      bcryptHashSpy.mockResolvedValue('hashed' as never);
      prisma.write.user.create.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('token');
      prisma.write.refreshToken.create.mockResolvedValue(mockRefreshToken);

      await service.signup(signupDto);

      expect(bcryptHashSpy).toHaveBeenCalledWith(signupDto.password, 10);
      bcryptHashSpy.mockRestore();
    });

    it('should use bcrypt for secure refresh token hashing', async () => {
      const bcryptHashSpy = jest.spyOn(bcrypt, 'hash');
      bcryptHashSpy.mockResolvedValue('hashed' as never);
      jwtService.sign.mockReturnValue('token');
      prisma.write.refreshToken.create.mockResolvedValue(mockRefreshToken);

      await service.generateTokens('user-id', 'test@example.com', 'USER');

      // Should be called twice: once for refresh token
      expect(bcryptHashSpy).toHaveBeenCalled();
      bcryptHashSpy.mockRestore();
    });

    it('should not expose password_hash in responses', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password',
      };

      prisma.read.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      prisma.write.user.update.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('token');
      prisma.write.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const result = await service.login(loginDto);

      expect(result.user).not.toHaveProperty('password_hash');
    });

    it('should generate unique refresh tokens using UUID v4', async () => {
      jwtService.sign.mockReturnValue('token');
      prisma.write.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const result1 = await service.generateTokens('user-1', 'test1@example.com', 'USER');
      const result2 = await service.generateTokens('user-2', 'test2@example.com', 'USER');

      expect(result1.refresh_token).not.toBe(result2.refresh_token);
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(result1.refresh_token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });
});
