import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import { CustomLoggerService } from '@/common/modules/logger/logger.service';

/**
 * 웹훅 IP 화이트리스트 Guard
 *
 * Kakao Talk, LINE, 네이버 톡톡, Instagram(Meta) 공식 서버 IP만 허용
 */
@Injectable()
export class WebhookIpWhitelistGuard implements CanActivate {
  // Kakao Talk 공식 서버 IP 대역
  private readonly KAKAO_IP_RANGES = [
    '110.76.141.0/24', // Kakao 공식 IP 대역 1
    '211.231.99.0/24', // Kakao 공식 IP 대역 2
  ];

  // LINE 공식 서버 IP 대역
  private readonly LINE_IP_RANGES = [
    '147.92.128.0/17', // LINE 공식 IP 대역
  ];

  // 네이버 톡톡 공식 서버 IP 대역
  private readonly NAVER_TALK_IP_RANGES = [
    '117.52.0.0/13', // 네이버 공식 IP 대역 1
    '125.209.192.0/18', // 네이버 공식 IP 대역 2
    '223.130.192.0/19', // 네이버 공식 IP 대역 3
    '211.249.40.0/22', // 네이버 공식 IP 대역 4
  ];

  // Instagram/Meta 공식 서버 IP 대역
  // Meta 공식 문서에서 제공하는 IP 범위
  private readonly INSTAGRAM_IP_RANGES = [
    '157.240.0.0/16', // Meta/Facebook IP 대역 1
    '31.13.24.0/21', // Meta/Facebook IP 대역 2
    '31.13.64.0/18', // Meta/Facebook IP 대역 3
    '66.220.144.0/20', // Meta/Facebook IP 대역 4
    '69.63.176.0/20', // Meta/Facebook IP 대역 5
    '69.171.224.0/19', // Meta/Facebook IP 대역 6
    '74.119.76.0/22', // Meta/Facebook IP 대역 7
    '173.252.64.0/18', // Meta/Facebook IP 대역 8
    '204.15.20.0/22', // Meta/Facebook IP 대역 9
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: CustomLoggerService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);

    // 개발/테스트 환경에서는 IP 검증 스킵
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    if (nodeEnv === 'development' || nodeEnv === 'test') {
      this.logger.log(`${nodeEnv} mode - IP whitelist check skipped for ${clientIp}`);
      return true;
    }

    // 환경 변수로 화이트리스트 비활성화 가능
    const ipWhitelistEnabled = this.configService.get<string>('WEBHOOK_IP_WHITELIST_ENABLED', 'true');
    if (ipWhitelistEnabled === 'false') {
      this.logger.warn('IP whitelist is disabled via environment variable');
      return true;
    }

    // URL에서 플랫폼 감지
    const url = request.url;
    const platform = this.detectPlatform(url);

    // 플랫폼별 IP 검증
    const isAllowed = this.isIpAllowed(clientIp, platform);

    if (!isAllowed) {
      this.logger.warn(`Webhook request blocked - IP not whitelisted`, 'WebhookIpWhitelistGuard', {
        clientIp,
        platform,
        url,
      });
      throw new ForbiddenException(`Webhook access denied - IP not whitelisted: ${clientIp}`);
    }

    this.logger.log(`Webhook IP verified: ${clientIp} (${platform})`, 'WebhookIpWhitelistGuard');
    return true;
  }

  /**
   * 클라이언트 IP 주소 추출
   */
  private getClientIp(request: Request): string {
    // 1. X-Forwarded-For 헤더 (프록시/로드밸런서 뒤에 있을 때)
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
      return ips[0].trim();
    }

    // 2. X-Real-IP 헤더
    const realIp = request.headers['x-real-ip'];
    if (realIp && typeof realIp === 'string') {
      return realIp.trim();
    }

    // 3. Socket IP
    return request.socket.remoteAddress || 'unknown';
  }

  /**
   * URL에서 플랫폼 감지
   */
  private detectPlatform(url: string): 'KAKAO' | 'LINE' | 'NAVER_TALK' | 'INSTAGRAM' | 'UNKNOWN' {
    if (url.includes('/webhooks/kakao/')) {
      return 'KAKAO';
    }
    if (url.includes('/webhooks/line/')) {
      return 'LINE';
    }
    if (url.includes('/webhooks/naver-talk/')) {
      return 'NAVER_TALK';
    }
    if (url.includes('/webhooks/instagram/')) {
      return 'INSTAGRAM';
    }
    return 'UNKNOWN';
  }

  /**
   * IP가 플랫폼 화이트리스트에 포함되는지 확인
   */
  private isIpAllowed(ip: string, platform: 'KAKAO' | 'LINE' | 'NAVER_TALK' | 'INSTAGRAM' | 'UNKNOWN'): boolean {
    let ranges: string[];
    switch (platform) {
      case 'KAKAO':
        ranges = this.KAKAO_IP_RANGES;
        break;
      case 'LINE':
        ranges = this.LINE_IP_RANGES;
        break;
      case 'NAVER_TALK':
        ranges = this.NAVER_TALK_IP_RANGES;
        break;
      case 'INSTAGRAM':
        ranges = this.INSTAGRAM_IP_RANGES;
        break;
      default:
        ranges = [];
    }

    // IPv4 형식 확인
    if (!this.isValidIpv4(ip)) {
      this.logger.warn(`Invalid IPv4 format: ${ip}`);
      return false;
    }

    // CIDR 범위 내에 있는지 확인
    for (const range of ranges) {
      if (this.isIpInCidr(ip, range)) {
        return true;
      }
    }

    return false;
  }

  /**
   * IPv4 형식 검증
   */
  private isValidIpv4(ip: string): boolean {
    const ipv4Regex =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  }

  /**
   * IP가 CIDR 범위 내에 있는지 확인
   */
  private isIpInCidr(ip: string, cidr: string): boolean {
    const [range, bits = '32'] = cidr.split('/');
    const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);

    const ipInt = this.ipToInt(ip);
    const rangeInt = this.ipToInt(range);

    return (ipInt & mask) === (rangeInt & mask);
  }

  /**
   * IP 주소를 정수로 변환
   */
  private ipToInt(ip: string): number {
    return ip.split('.').reduce((int, octet) => (int << 8) + parseInt(octet, 10), 0) >>> 0;
  }
}
