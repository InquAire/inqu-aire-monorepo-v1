import * as crypto from 'crypto';

/**
 * AES-256-GCM 암호화 유틸리티
 *
 * API Key 및 민감한 데이터를 안전하게 암호화/복호화합니다.
 *
 * 특징:
 * - AES-256-GCM: 산업 표준 암호화 알고리즘
 * - 인증 태그: 데이터 무결성 보장
 * - 랜덤 IV: 매번 다른 암호문 생성 (같은 평문이라도)
 * - Base64 인코딩: DB 저장 및 전송 용이
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * 암호화 결과 포맷:
 * [salt:iv:authTag:encryptedData]
 * - salt: 64 bytes (비밀번호 기반 키 파생용)
 * - iv: 16 bytes (초기화 벡터)
 * - authTag: 16 bytes (인증 태그)
 * - encryptedData: 가변 길이 (암호화된 데이터)
 */

/**
 * 안전한 암호화 키 생성
 *
 * @returns 64자리 16진수 문자열 (256 bits)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * 비밀번호에서 암호화 키 파생
 *
 * @param password - 마스터 비밀번호 (환경 변수)
 * @param salt - Salt (없으면 새로 생성)
 * @returns { key, salt }
 */
function deriveKey(password: string, salt?: Buffer): { key: Buffer; salt: Buffer } {
  const actualSalt = salt || crypto.randomBytes(SALT_LENGTH);

  // PBKDF2를 사용한 키 파생
  // - 600,000번 해싱 (OWASP 2024 권장사항)
  // - SHA-512 해시 함수 사용
  // - 브루트포스 공격 방어 강화
  const key = crypto.pbkdf2Sync(password, actualSalt, 600000, KEY_LENGTH, 'sha512');

  return { key, salt: actualSalt };
}

/**
 * 데이터 암호화
 *
 * @param plaintext - 암호화할 평문
 * @param encryptionKey - 암호화 키 (환경 변수에서 가져옴)
 * @returns Base64로 인코딩된 암호문 (salt:iv:authTag:encryptedData)
 * @throws {Error} 암호화 실패 시
 */
export function encrypt(plaintext: string, encryptionKey: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }

  if (!encryptionKey) {
    throw new Error('Encryption key is required');
  }

  try {
    // 1. Salt 생성 및 키 파생
    const { key, salt } = deriveKey(encryptionKey);

    // 2. 랜덤 IV 생성
    const iv = crypto.randomBytes(IV_LENGTH);

    // 3. Cipher 생성 및 암호화
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // 4. 암호화 실행
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // 5. 인증 태그 추출 (GCM 모드)
    const authTag = cipher.getAuthTag();

    // 6. 결과 포맷: [salt:iv:authTag:encryptedData] (모두 Base64)
    const result = [
      salt.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted,
    ].join(':');

    return result;
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * 데이터 복호화
 *
 * @param ciphertext - 암호화된 텍스트 (Base64 인코딩)
 * @param encryptionKey - 암호화 키 (환경 변수에서 가져옴)
 * @returns 복호화된 평문
 * @throws {Error} 복호화 실패 시 (잘못된 키, 데이터 변조 등)
 */
export function decrypt(ciphertext: string, encryptionKey: string): string {
  if (!ciphertext) {
    throw new Error('Cannot decrypt empty string');
  }

  if (!encryptionKey) {
    throw new Error('Decryption key is required');
  }

  try {
    // 1. 암호문 파싱 [salt:iv:authTag:encryptedData]
    const parts = ciphertext.split(':');

    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    const [saltBase64, ivBase64, authTagBase64, encryptedData] = parts;

    // 2. Base64 디코딩
    const salt = Buffer.from(saltBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    // 3. 키 파생 (같은 salt 사용)
    const { key } = deriveKey(encryptionKey, salt);

    // 4. Decipher 생성
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    // 5. 인증 태그 설정 (데이터 무결성 검증)
    decipher.setAuthTag(authTag);

    // 6. 복호화 실행
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // 인증 태그 검증 실패 = 데이터가 변조되었거나 잘못된 키 사용
    if (
      error instanceof Error &&
      error.message.includes('Unsupported state or unable to authenticate data')
    ) {
      throw new Error('Decryption failed: Invalid key or data has been tampered with');
    }

    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * 암호화된 데이터인지 확인
 *
 * @param data - 확인할 데이터
 * @returns 암호화된 형식이면 true
 */
export function isEncrypted(data: string): boolean {
  if (!data) {
    return false;
  }

  // 암호화된 데이터는 [salt:iv:authTag:encryptedData] 형식
  const parts = data.split(':');
  if (parts.length !== 4) {
    return false;
  }

  // Base64 형식 검증 (A-Z, a-z, 0-9, +, /, =)
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return parts.every(part => part.length > 0 && base64Regex.test(part));
}

/**
 * 암호화 키 검증
 *
 * @param key - 검증할 키
 * @returns 유효한 키면 true
 */
export function validateEncryptionKey(key: string): boolean {
  if (!key) {
    return false;
  }

  // 키는 최소 32자 이상이어야 함 (256 bits)
  if (key.length < 32) {
    return false;
  }

  return true;
}

/**
 * 테스트용 암호화/복호화 검증
 *
 * @param encryptionKey - 암호화 키
 * @returns 검증 성공 여부
 */
export function testEncryption(encryptionKey: string): boolean {
  try {
    const testData = 'test-encryption-key-validation';
    const encrypted = encrypt(testData, encryptionKey);
    const decrypted = decrypt(encrypted, encryptionKey);

    return decrypted === testData;
  } catch {
    return false;
  }
}
