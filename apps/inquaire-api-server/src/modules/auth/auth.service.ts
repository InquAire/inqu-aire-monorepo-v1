import * as crypto from 'crypto';

import { type JwtPayload } from '@ai-next/nestjs-shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

import { CustomLoggerService } from '@/common/modules/logger/logger.service';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    _configService: ConfigService,
    private readonly logger: CustomLoggerService
  ) {
    // _configService is available in constructor but not stored
  }

  /**
   * 회원가입
   */
  async signup(dto: SignupDto) {
    this.logger.log('Signup attempt', 'AuthService', { email: dto.email });

    // 이메일 중복 확인 (Read DB)
    const existing = await this.prisma.read.user.findFirst({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    // 비밀번호 해싱
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 사용자 생성 (Write DB)
    const user = await this.prisma.write.user.create({
      data: {
        email: dto.email,
        password_hash: passwordHash,
        name: dto.name,
        role: 'USER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true,
      },
    });

    this.logger.logBusinessEvent('user_registered', {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // JWT 토큰 생성
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user,
      ...tokens,
    };
  }

  /**
   * 로그인
   */
  async login(dto: LoginDto) {
    this.logger.log('Login attempt', 'AuthService', { email: dto.email });

    // 사용자 조회 (Read DB)
    const user = await this.prisma.read.user.findFirst({
      where: { email: dto.email },
    });

    if (!user || user.deleted_at) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 마지막 로그인 시간 업데이트 (Write DB)
    await this.prisma.write.user.updateMany({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    // 사용자의 조직 멤버십 조회 (Read DB)
    const organizationMemberships = await this.prisma.read.organizationMember.findMany({
      where: {
        user_id: user.id,
        deleted_at: null,
        organization: {
          deleted_at: null,
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo_url: true,
          },
        },
      },
      orderBy: {
        joined_at: 'asc',
      },
    });

    const organizations = organizationMemberships.map(m => ({
      organization: m.organization,
      role: m.role,
      permissions: m.permissions,
    }));

    this.logger.logBusinessEvent('user_login', {
      userId: user.id,
      email: user.email,
      organizationCount: organizations.length,
    });

    // JWT 토큰 생성
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      },
      organizations,
      ...tokens,
    };
  }

  /**
   * JWT 토큰 생성 (Access Token + Refresh Token)
   */
  async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = uuidv4();

    // 보안용 bcrypt hash (느리지만 안전)
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    // 빠른 조회용 SHA-256 hash (O(1) lookup)
    const lookupHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7일 후 만료

    // Refresh Token 저장 (Write DB)
    await this.prisma.write.refreshToken.create({
      data: {
        user_id: userId,
        token_hash: tokenHash,
        lookup_hash: lookupHash,
        expires_at: expiresAt,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900, // 15분 (초 단위)
    };
  }

  /**
   * Refresh Token으로 새 Access Token 발급
   * 성능 최적화: O(n) → O(1) lookup_hash 인덱스 사용
   */
  async refreshAccessToken(refreshToken: string) {
    this.logger.log('Refresh token attempt', 'AuthService');

    // SHA-256 해시로 빠른 조회 (O(1))
    const lookupHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // lookup_hash로 토큰 조회 (인덱스 사용, O(1))
    const tokenRecord = await this.prisma.read.refreshToken.findFirst({
      where: { lookup_hash: lookupHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 만료 확인
    if (tokenRecord.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // 철회 확인
    if (tokenRecord.revoked_at) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    // bcrypt로 2차 검증 (보안 강화)
    const isMatch = await bcrypt.compare(refreshToken, tokenRecord.token_hash);
    if (!isMatch) {
      this.logger.warn(
        'Lookup hash matched but bcrypt failed - possible hash collision',
        'AuthService'
      );
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 사용자 확인
    if (tokenRecord.user.deleted_at) {
      throw new UnauthorizedException('User not found');
    }

    this.logger.log('Refresh token validated', 'AuthService', { userId: tokenRecord.user.id });

    // 새 토큰 발급
    const tokens = await this.generateTokens(
      tokenRecord.user.id,
      tokenRecord.user.email,
      tokenRecord.user.role
    );

    // 기존 Refresh Token 삭제 (Write DB)
    await this.prisma.write.refreshToken.delete({
      where: { id: tokenRecord.id },
    });

    return tokens;
  }

  /**
   * 로그아웃 (Refresh Token 삭제)
   * 성능 최적화: O(n) → O(1) lookup_hash 인덱스 사용
   */
  async logout(refreshToken: string) {
    this.logger.log('Logout attempt', 'AuthService');

    // SHA-256 해시로 빠른 조회 (O(1))
    const lookupHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // lookup_hash로 토큰 조회 (인덱스 사용, O(1))
    const tokenRecord = await this.prisma.read.refreshToken.findFirst({
      where: { lookup_hash: lookupHash },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid refresh token');
    }

    // bcrypt로 2차 검증
    const isMatch = await bcrypt.compare(refreshToken, tokenRecord.token_hash);
    if (!isMatch) {
      throw new BadRequestException('Invalid refresh token');
    }

    // Refresh Token 삭제 (Write DB)
    await this.prisma.write.refreshToken.delete({
      where: { id: tokenRecord.id },
    });

    this.logger.logBusinessEvent('user_logout', { message: 'Logout successful' });
    return { message: 'Logged out successfully' };
  }

  /**
   * 사용자 정보 조회
   */
  async getProfile(userId: string) {
    // 프로필 조회 (Read DB)
    const user = await this.prisma.read.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar_url: true,
        role: true,
        created_at: true,
        last_login_at: true,
        deleted_at: true,
      },
    });

    if (!user || user.deleted_at) {
      throw new UnauthorizedException('User not found');
    }

    // 사용자의 조직 멤버십 조회 (Read DB)
    const organizationMemberships = await this.prisma.read.organizationMember.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
        organization: {
          deleted_at: null,
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo_url: true,
          },
        },
      },
      orderBy: {
        joined_at: 'asc',
      },
    });

    const organizations = organizationMemberships.map(m => ({
      organization: m.organization,
      role: m.role,
      permissions: m.permissions,
    }));

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      role: user.role,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
      organizations,
    };
  }

  /**
   * 프로필 업데이트
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    this.logger.log(`Updating profile for user: ${userId}`);

    // 사용자 존재 확인 (Read DB)
    const user = await this.prisma.read.user.findFirst({
      where: { id: userId },
    });

    if (!user || user.deleted_at) {
      throw new UnauthorizedException('User not found');
    }

    // 이메일 변경 시 중복 확인
    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.read.user.findFirst({
        where: { email: dto.email },
      });

      if (existing) {
        throw new ConflictException('Email already exists');
      }
    }

    // 프로필 업데이트 (Write DB)
    const updated = await this.prisma.write.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        created_at: true,
        last_login_at: true,
      },
    });

    this.logger.log(`Profile updated for user: ${userId}`);
    return updated;
  }

  /**
   * 비밀번호 변경
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    this.logger.log(`Changing password for user: ${userId}`);

    // 사용자 조회 (Read DB)
    const user = await this.prisma.read.user.findFirst({
      where: { id: userId },
    });

    if (!user || user.deleted_at) {
      throw new UnauthorizedException('User not found');
    }

    // 현재 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password_hash);

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // 새 비밀번호 해싱
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // 비밀번호 업데이트 (Write DB)
    await this.prisma.write.user.update({
      where: { id: userId },
      data: { password_hash: newPasswordHash },
    });

    this.logger.log(`Password changed for user: ${userId}`);
    return { message: 'Password changed successfully' };
  }

  /**
   * JWT 페이로드 검증
   */
  async validateUser(payload: JwtPayload) {
    // 사용자 검증 (Read DB)
    const user = await this.prisma.read.user.findFirst({
      where: { id: payload.sub },
    });

    if (!user || user.deleted_at) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
