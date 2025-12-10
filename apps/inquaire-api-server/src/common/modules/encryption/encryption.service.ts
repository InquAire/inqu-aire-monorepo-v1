import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  decrypt,
  encrypt,
  generateEncryptionKey,
  isEncrypted,
  testEncryption,
  validateEncryptionKey,
} from '@/common/utils/encryption.util';

/**
 * 암호화 서비스
 *
 * API Key 및 민감한 데이터를 암호화/복호화합니다.
 * AES-256-GCM 알고리즘 사용
 */
@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly encryptionKey: string;

  constructor(private readonly configService: ConfigService) {
    // 환경 변수에서 암호화 키 가져오기
    this.encryptionKey = this.configService.get<string>('ENCRYPTION_KEY', '');
  }

  /**
   * 모듈 초기화 시 암호화 키 검증
   */
  async onModuleInit() {
    if (!this.encryptionKey) {
      this.logger.error('⚠️  ENCRYPTION_KEY is not set in environment variables');
      this.logger.error('   Please set ENCRYPTION_KEY in your .env file');
      this.logger.error('   You can generate a key using: npm run generate:encryption-key');
      throw new Error('ENCRYPTION_KEY is required');
    }

    // 키 검증
    if (!validateEncryptionKey(this.encryptionKey)) {
      this.logger.error('⚠️  ENCRYPTION_KEY is invalid (must be at least 32 characters)');
      throw new Error('Invalid ENCRYPTION_KEY');
    }

    // 암호화/복호화 테스트
    if (!testEncryption(this.encryptionKey)) {
      this.logger.error('⚠️  Encryption test failed - key may be corrupted');
      throw new Error('Encryption test failed');
    }

    this.logger.log('✅ Encryption service initialized successfully');
  }

  /**
   * 데이터 암호화
   *
   * @param plaintext - 암호화할 평문
   * @returns 암호화된 텍스트 (Base64)
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      return plaintext;
    }

    try {
      return encrypt(plaintext, this.encryptionKey);
    } catch (error) {
      this.logger.error(`Encryption error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 데이터 복호화
   *
   * @param ciphertext - 암호화된 텍스트
   * @returns 복호화된 평문
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext) {
      return ciphertext;
    }

    try {
      return decrypt(ciphertext, this.encryptionKey);
    } catch (error) {
      this.logger.error(`Decryption error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 암호화된 데이터인지 확인
   *
   * @param data - 확인할 데이터
   * @returns 암호화된 형식이면 true
   */
  isEncrypted(data: string): boolean {
    return isEncrypted(data);
  }

  /**
   * 데이터가 암호화되지 않았으면 암호화, 이미 암호화되었으면 그대로 반환
   *
   * @param data - 데이터
   * @returns 암호화된 데이터
   */
  encryptIfNeeded(data: string | null | undefined): string | null {
    if (!data) {
      return null;
    }

    if (this.isEncrypted(data)) {
      // 이미 암호화됨
      return data;
    }

    // 암호화되지 않았으면 암호화
    return this.encrypt(data);
  }

  /**
   * 암호화 키 생성 (관리자용)
   *
   * @returns 새로운 암호화 키 (64자리 16진수)
   */
  static generateKey(): string {
    return generateEncryptionKey();
  }

  /**
   * 여러 필드를 한번에 암호화
   *
   * @param data - 암호화할 객체
   * @param fields - 암호화할 필드명 배열
   * @returns 암호화된 객체
   */
  encryptFields<T extends Record<string, unknown>>(data: T, fields: (keyof T)[]): T {
    const encrypted = { ...data };

    for (const field of fields) {
      const value = data[field];
      if (typeof value === 'string') {
        encrypted[field] = this.encrypt(value) as T[keyof T];
      }
    }

    return encrypted;
  }

  /**
   * 여러 필드를 한번에 복호화
   *
   * @param data - 복호화할 객체
   * @param fields - 복호화할 필드명 배열
   * @returns 복호화된 객체
   */
  decryptFields<T extends Record<string, unknown>>(data: T, fields: (keyof T)[]): T {
    const decrypted = { ...data };

    for (const field of fields) {
      const value = data[field];
      if (typeof value === 'string' && this.isEncrypted(value)) {
        try {
          decrypted[field] = this.decrypt(value) as T[keyof T];
        } catch (error) {
          this.logger.warn(`Failed to decrypt field '${String(field)}': ${error instanceof Error ? error.message : 'Unknown error'}`);
          // 복호화 실패 시 원본 유지 (마이그레이션 중 평문 데이터 대응)
        }
      }
    }

    return decrypted;
  }
}
