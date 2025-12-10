/**
 * AuthController Unit Tests
 *
 * 테스트 범위:
 * - 회원가입 엔드포인트
 * - 로그인 엔드포인트
 * - 토큰 재발급
 * - 로그아웃
 * - 프로필 조회
 * - 에러 핸들링
 */

// Mock bcrypt to avoid native module issues
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import type { AuthUser } from '@ai-next/nestjs-shared';
import { UnauthorizedException } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignupDto } from './dto/signup.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER' as const,
    created_at: new Date('2025-01-01'),
  };

  const mockSignupDto: SignupDto = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
  };

  const mockLoginDto: LoginDto = {
    email: 'test@example.com',
    password: 'password123',
  };

  const mockRefreshTokenDto: RefreshTokenDto = {
    refresh_token: 'refresh-token-123',
  };

  const mockSignupResult = {
    user: mockUser,
    access_token: 'access-token-123',
    refresh_token: 'refresh-token-123',
    expires_in: 900,
  };

  const mockLoginResult = {
    user: mockUser,
    access_token: 'access-token-123',
    refresh_token: 'refresh-token-123',
    expires_in: 900,
  };

  const mockRefreshResult = {
    access_token: 'new-access-token-123',
    refresh_token: 'new-refresh-token-123',
    expires_in: 3600,
  };

  const mockLogoutResult = {
    message: 'Logged out successfully',
  };

  const mockProfileResult = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatar_url: null,
    role: 'USER' as const,
    created_at: new Date('2025-01-01'),
    last_login_at: new Date('2025-01-10'),
    organizations: [],
  };

  beforeEach(() => {
    const mockAuthService = {
      signup: jest.fn(),
      login: jest.fn(),
      refreshAccessToken: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
    };

    // Direct instantiation to avoid decorator dependency issues
    controller = new AuthController(mockAuthService as unknown as AuthService);
    authService = mockAuthService as unknown as jest.Mocked<AuthService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(controller.signup).toBeDefined();
    });

    it('should successfully sign up a new user', async () => {
      // Arrange
      authService.signup.mockResolvedValue(
        mockSignupResult as unknown as Awaited<ReturnType<AuthService['signup']>>
      );

      // Act
      const result = await controller.signup(mockSignupDto);

      // Assert
      expect(result).toEqual(mockSignupResult);
      expect(authService.signup).toHaveBeenCalledWith(mockSignupDto);
      expect(authService.signup).toHaveBeenCalledTimes(1);
    });

    it('should pass all DTO fields to service', async () => {
      // Arrange
      const fullSignupDto: SignupDto = {
        email: 'newuser@example.com',
        password: 'securepassword123',
        name: 'New User',
      };
      authService.signup.mockResolvedValue(
        mockSignupResult as unknown as Awaited<ReturnType<AuthService['signup']>>
      );

      // Act
      await controller.signup(fullSignupDto);

      // Assert
      expect(authService.signup).toHaveBeenCalledWith(fullSignupDto);
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Email already exists');
      authService.signup.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.signup(mockSignupDto)).rejects.toThrow('Email already exists');
      expect(authService.signup).toHaveBeenCalled();
    });

    it('should return user and tokens on successful signup', async () => {
      // Arrange
      authService.signup.mockResolvedValue(
        mockSignupResult as unknown as Awaited<ReturnType<AuthService['signup']>>
      );

      // Act
      const result = await controller.signup(mockSignupDto);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.user).toEqual(mockUser);
    });
  });

  describe('login', () => {
    it('should be defined', () => {
      expect(controller.login).toBeDefined();
    });

    it('should successfully login a user', async () => {
      // Arrange
      authService.login.mockResolvedValue(
        mockLoginResult as unknown as Awaited<ReturnType<AuthService['login']>>
      );

      // Act
      const result = await controller.login(mockLoginDto);

      // Assert
      expect(result).toEqual(mockLoginResult);
      expect(authService.login).toHaveBeenCalledWith(mockLoginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
    });

    it('should pass all DTO fields to service', async () => {
      // Arrange
      const customLoginDto: LoginDto = {
        email: 'another@example.com',
        password: 'differentpassword',
      };
      authService.login.mockResolvedValue(
        mockLoginResult as unknown as Awaited<ReturnType<AuthService['login']>>
      );

      // Act
      await controller.login(customLoginDto);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(customLoginDto);
    });

    it('should handle UnauthorizedException for invalid credentials', async () => {
      // Arrange
      const error = new UnauthorizedException('Invalid credentials');
      authService.login.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.login(mockLoginDto)).rejects.toThrow(UnauthorizedException);
      await expect(controller.login(mockLoginDto)).rejects.toThrow('Invalid credentials');
    });

    it('should return user and tokens on successful login', async () => {
      // Arrange
      authService.login.mockResolvedValue(
        mockLoginResult as unknown as Awaited<ReturnType<AuthService['login']>>
      );

      // Act
      const result = await controller.login(mockLoginDto);

      // Assert
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result.user).toEqual(mockUser);
    });

    it('should handle different email addresses', async () => {
      // Arrange
      const loginDtos: LoginDto[] = [
        { email: 'user1@example.com', password: 'pass1' },
        { email: 'user2@example.com', password: 'pass2' },
      ];
      authService.login.mockResolvedValue(
        mockLoginResult as unknown as Awaited<ReturnType<AuthService['login']>>
      );

      // Act
      for (const dto of loginDtos) {
        await controller.login(dto);
      }

      // Assert
      expect(authService.login).toHaveBeenCalledTimes(2);
      expect(authService.login).toHaveBeenCalledWith(loginDtos[0]);
      expect(authService.login).toHaveBeenCalledWith(loginDtos[1]);
    });
  });

  describe('refresh', () => {
    it('should be defined', () => {
      expect(controller.refresh).toBeDefined();
    });

    it('should successfully refresh access token', async () => {
      // Arrange
      authService.refreshAccessToken.mockResolvedValue(
        mockRefreshResult as unknown as Awaited<ReturnType<AuthService['refreshAccessToken']>>
      );

      // Act
      const result = await controller.refresh(mockRefreshTokenDto);

      // Assert
      expect(result).toEqual(mockRefreshResult);
      expect(authService.refreshAccessToken).toHaveBeenCalledWith(
        mockRefreshTokenDto.refresh_token
      );
      expect(authService.refreshAccessToken).toHaveBeenCalledTimes(1);
    });

    it('should extract refresh_token from DTO', async () => {
      // Arrange
      const customRefreshDto: RefreshTokenDto = {
        refresh_token: 'different-refresh-token',
      };
      authService.refreshAccessToken.mockResolvedValue(
        mockRefreshResult as unknown as Awaited<ReturnType<AuthService['refreshAccessToken']>>
      );

      // Act
      await controller.refresh(customRefreshDto);

      // Assert
      expect(authService.refreshAccessToken).toHaveBeenCalledWith(customRefreshDto.refresh_token);
    });

    it('should handle UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      const error = new UnauthorizedException('Invalid refresh token');
      authService.refreshAccessToken.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.refresh(mockRefreshTokenDto)).rejects.toThrow(UnauthorizedException);
      await expect(controller.refresh(mockRefreshTokenDto)).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should return new access token on successful refresh', async () => {
      // Arrange
      authService.refreshAccessToken.mockResolvedValue(
        mockRefreshResult as unknown as Awaited<ReturnType<AuthService['refreshAccessToken']>>
      );

      // Act
      const result = await controller.refresh(mockRefreshTokenDto);

      // Assert
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('expires_in');
      expect(result.access_token).toBe('new-access-token-123');
    });

    it('should handle expired refresh token', async () => {
      // Arrange
      const error = new UnauthorizedException('Refresh token expired');
      authService.refreshAccessToken.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.refresh(mockRefreshTokenDto)).rejects.toThrow(
        'Refresh token expired'
      );
    });

    it('should handle different refresh tokens', async () => {
      // Arrange
      const refreshTokens: RefreshTokenDto[] = [
        { refresh_token: 'token-1' },
        { refresh_token: 'token-2' },
      ];
      authService.refreshAccessToken.mockResolvedValue(
        mockRefreshResult as unknown as Awaited<ReturnType<AuthService['refreshAccessToken']>>
      );

      // Act
      for (const dto of refreshTokens) {
        await controller.refresh(dto);
      }

      // Assert
      expect(authService.refreshAccessToken).toHaveBeenCalledTimes(2);
      expect(authService.refreshAccessToken).toHaveBeenCalledWith('token-1');
      expect(authService.refreshAccessToken).toHaveBeenCalledWith('token-2');
    });
  });

  describe('logout', () => {
    it('should be defined', () => {
      expect(controller.logout).toBeDefined();
    });

    it('should successfully logout a user', async () => {
      // Arrange
      authService.logout.mockResolvedValue(mockLogoutResult);

      // Act
      const result = await controller.logout(mockRefreshTokenDto);

      // Assert
      expect(result).toEqual(mockLogoutResult);
      expect(authService.logout).toHaveBeenCalledWith(mockRefreshTokenDto.refresh_token);
      expect(authService.logout).toHaveBeenCalledTimes(1);
    });

    it('should extract refresh_token from DTO', async () => {
      // Arrange
      const customRefreshDto: RefreshTokenDto = {
        refresh_token: 'different-refresh-token',
      };
      authService.logout.mockResolvedValue(mockLogoutResult);

      // Act
      await controller.logout(customRefreshDto);

      // Assert
      expect(authService.logout).toHaveBeenCalledWith(customRefreshDto.refresh_token);
    });

    it('should handle UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      const error = new UnauthorizedException('Invalid refresh token');
      authService.logout.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.logout(mockRefreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return success message on successful logout', async () => {
      // Arrange
      authService.logout.mockResolvedValue(mockLogoutResult);

      // Act
      const result = await controller.logout(mockRefreshTokenDto);

      // Assert
      expect(result).toHaveProperty('message');
      expect(result.message).toBe('Logged out successfully');
    });

    it('should handle different refresh tokens', async () => {
      // Arrange
      const refreshTokens: RefreshTokenDto[] = [
        { refresh_token: 'token-1' },
        { refresh_token: 'token-2' },
      ];
      authService.logout.mockResolvedValue(mockLogoutResult);

      // Act
      for (const dto of refreshTokens) {
        await controller.logout(dto);
      }

      // Assert
      expect(authService.logout).toHaveBeenCalledTimes(2);
      expect(authService.logout).toHaveBeenCalledWith('token-1');
      expect(authService.logout).toHaveBeenCalledWith('token-2');
    });
  });

  describe('getProfile', () => {
    const mockAuthUser: AuthUser = {
      id: 'user-123',
      sub: 'user-123',
      roles: ['USER'],
    };

    it('should be defined', () => {
      expect(controller.getProfile).toBeDefined();
    });

    it('should successfully get user profile', async () => {
      // Arrange
      authService.getProfile.mockResolvedValue(mockProfileResult);

      // Act
      const result = await controller.getProfile(mockAuthUser);

      // Assert
      expect(result).toEqual(mockProfileResult);
      expect(authService.getProfile).toHaveBeenCalledWith(mockAuthUser.id);
      expect(authService.getProfile).toHaveBeenCalledTimes(1);
    });

    it('should extract user id from AuthUser', async () => {
      // Arrange
      const customUser: AuthUser = {
        id: 'user-456',
        sub: 'user-456',
        roles: ['ADMIN'],
      };
      authService.getProfile.mockResolvedValue(mockProfileResult);

      // Act
      await controller.getProfile(customUser);

      // Assert
      expect(authService.getProfile).toHaveBeenCalledWith(customUser.id);
    });

    it('should handle UnauthorizedException when user not found', async () => {
      // Arrange
      const error = new UnauthorizedException('User not found');
      authService.getProfile.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getProfile(mockAuthUser)).rejects.toThrow(UnauthorizedException);
      await expect(controller.getProfile(mockAuthUser)).rejects.toThrow('User not found');
    });

    it('should return user profile with all fields', async () => {
      // Arrange
      authService.getProfile.mockResolvedValue(mockProfileResult);

      // Act
      const result = await controller.getProfile(mockAuthUser);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('created_at');
      expect(result).toHaveProperty('last_login_at');
    });

    it('should handle different user IDs', async () => {
      // Arrange
      const users: AuthUser[] = [
        { id: 'user-1', sub: 'user-1', roles: ['USER'] },
        { id: 'user-2', sub: 'user-2', roles: ['ADMIN'] },
      ];
      authService.getProfile.mockResolvedValue(mockProfileResult);

      // Act
      for (const user of users) {
        await controller.getProfile(user);
      }

      // Assert
      expect(authService.getProfile).toHaveBeenCalledTimes(2);
      expect(authService.getProfile).toHaveBeenCalledWith('user-1');
      expect(authService.getProfile).toHaveBeenCalledWith('user-2');
    });

    it('should handle users with different roles', async () => {
      // Arrange
      const adminUser: AuthUser = {
        id: 'admin-123',
        sub: 'admin-123',
        roles: ['ADMIN'],
      };
      authService.getProfile.mockResolvedValue(mockProfileResult);

      // Act
      await controller.getProfile(adminUser);

      // Assert
      expect(authService.getProfile).toHaveBeenCalledWith(adminUser.id);
    });
  });

  describe('Integration with Service', () => {
    it('should correctly pass all parameters to signup service', async () => {
      // Arrange
      authService.signup.mockResolvedValue(
        mockSignupResult as unknown as Awaited<ReturnType<AuthService['signup']>>
      );

      // Act
      await controller.signup(mockSignupDto);

      // Assert
      expect(authService.signup).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        })
      );
    });

    it('should correctly pass all parameters to login service', async () => {
      // Arrange
      authService.login.mockResolvedValue(
        mockLoginResult as unknown as Awaited<ReturnType<AuthService['login']>>
      );

      // Act
      await controller.login(mockLoginDto);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'password123',
        })
      );
    });

    it('should correctly extract refresh_token from DTO in refresh endpoint', async () => {
      // Arrange
      authService.refreshAccessToken.mockResolvedValue(
        mockRefreshResult as unknown as Awaited<ReturnType<AuthService['refreshAccessToken']>>
      );

      // Act
      await controller.refresh(mockRefreshTokenDto);

      // Assert
      expect(authService.refreshAccessToken).toHaveBeenCalledWith('refresh-token-123');
    });

    it('should correctly extract refresh_token from DTO in logout endpoint', async () => {
      // Arrange
      authService.logout.mockResolvedValue(mockLogoutResult);

      // Act
      await controller.logout(mockRefreshTokenDto);

      // Assert
      expect(authService.logout).toHaveBeenCalledWith('refresh-token-123');
    });

    it('should correctly extract user id from AuthUser in getProfile endpoint', async () => {
      // Arrange
      const mockAuthUser: AuthUser = {
        id: 'user-123',
        sub: 'user-123',
        roles: ['USER'],
      };
      authService.getProfile.mockResolvedValue(mockProfileResult);

      // Act
      await controller.getProfile(mockAuthUser);

      // Assert
      expect(authService.getProfile).toHaveBeenCalledWith('user-123');
    });
  });

  describe('Error Handling', () => {
    it('should propagate signup errors', async () => {
      // Arrange
      const error = new Error('Database error');
      authService.signup.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.signup(mockSignupDto)).rejects.toThrow('Database error');
    });

    it('should propagate login errors', async () => {
      // Arrange
      const error = new Error('Service unavailable');
      authService.login.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.login(mockLoginDto)).rejects.toThrow('Service unavailable');
    });

    it('should propagate refresh errors', async () => {
      // Arrange
      const error = new Error('Token validation failed');
      authService.refreshAccessToken.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.refresh(mockRefreshTokenDto)).rejects.toThrow(
        'Token validation failed'
      );
    });

    it('should propagate logout errors', async () => {
      // Arrange
      const error = new Error('Logout failed');
      authService.logout.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.logout(mockRefreshTokenDto)).rejects.toThrow('Logout failed');
    });

    it('should propagate getProfile errors', async () => {
      // Arrange
      const mockAuthUser: AuthUser = {
        id: 'user-123',
        sub: 'user-123',
        roles: ['USER'],
      };
      const error = new Error('Profile fetch failed');
      authService.getProfile.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getProfile(mockAuthUser)).rejects.toThrow('Profile fetch failed');
    });
  });
});
