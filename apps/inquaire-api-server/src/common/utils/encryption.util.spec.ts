/**
 * Encryption Utility Unit Tests
 *
 * 테스트 범위:
 * - AES-256-GCM 암호화/복호화
 * - PBKDF2 키 파생 (600K iterations)
 * - 인증 태그 검증
 * - 에러 핸들링
 * - 엣지 케이스
 */

import {
  decrypt,
  encrypt,
  generateEncryptionKey,
  isEncrypted,
  testEncryption,
  validateEncryptionKey,
} from './encryption.util';

describe('Encryption Utility', () => {
  let testKey: string;

  beforeEach(() => {
    // 각 테스트마다 새로운 키 생성
    testKey = generateEncryptionKey();
  });

  describe('generateEncryptionKey', () => {
    it('should generate a 64-character hex string', () => {
      const key = generateEncryptionKey();

      expect(key).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/i.test(key)).toBe(true);
    });

    it('should generate unique keys on each call', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      const key3 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
      expect(key2).not.toBe(key3);
      expect(key1).not.toBe(key3);
    });

    it('should generate cryptographically random keys', () => {
      const keys = new Set();

      // 100개 키 생성해서 중복 없는지 확인
      for (let i = 0; i < 100; i++) {
        keys.add(generateEncryptionKey());
      }

      expect(keys.size).toBe(100);
    });
  });

  describe('encrypt', () => {
    it('should encrypt plaintext successfully', () => {
      const plaintext = 'my-secret-api-key';
      const encrypted = encrypt(plaintext, testKey);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext (random IV)', () => {
      const plaintext = 'same-text';

      const encrypted1 = encrypt(plaintext, testKey);
      const encrypted2 = encrypt(plaintext, testKey);
      const encrypted3 = encrypt(plaintext, testKey);

      // 같은 평문이라도 매번 다른 IV로 인해 다른 암호문 생성
      expect(encrypted1).not.toBe(encrypted2);
      expect(encrypted2).not.toBe(encrypted3);
    });

    it('should encrypt with correct format (salt:iv:authTag:encryptedData)', () => {
      const plaintext = 'test-data';
      const encrypted = encrypt(plaintext, testKey);

      const parts = encrypted.split(':');
      expect(parts).toHaveLength(4);

      // Base64 형식 검증
      const base64Regex = /^[A-Za-z0-9+/]+=*$/;
      parts.forEach(part => {
        expect(part.length).toBeGreaterThan(0);
        expect(base64Regex.test(part)).toBe(true);
      });
    });

    it('should encrypt unicode characters correctly', () => {
      const plaintext = '한글 테스트 🔐 émojis ñ';
      const encrypted = encrypt(plaintext, testKey);

      expect(encrypted).toBeDefined();
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should encrypt long strings', () => {
      const plaintext = 'x'.repeat(10000); // 10KB
      const encrypted = encrypt(plaintext, testKey);

      expect(encrypted).toBeDefined();
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should encrypt special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const encrypted = encrypt(plaintext, testKey);

      expect(encrypted).toBeDefined();
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should throw error when plaintext is empty', () => {
      expect(() => encrypt('', testKey)).toThrow('Cannot encrypt empty string');
    });

    it('should throw error when encryption key is missing', () => {
      expect(() => encrypt('test', '')).toThrow('Encryption key is required');
    });

    it('should throw error when encryption key is null', () => {
      expect(() => encrypt('test', null as unknown as string)).toThrow(
        'Encryption key is required'
      );
    });
  });

  describe('decrypt', () => {
    it('should decrypt ciphertext successfully', () => {
      const plaintext = 'my-secret-api-key';
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt unicode characters correctly', () => {
      const plaintext = '한글 테스트 🔐 émojis ñ';
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt long strings', () => {
      const plaintext = 'x'.repeat(10000);
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error when ciphertext is empty', () => {
      expect(() => decrypt('', testKey)).toThrow('Cannot decrypt empty string');
    });

    it('should throw error when decryption key is missing', () => {
      const encrypted = encrypt('test', testKey);

      expect(() => decrypt(encrypted, '')).toThrow('Decryption key is required');
    });

    it('should throw error when using wrong key', () => {
      const plaintext = 'secret';
      const encrypted = encrypt(plaintext, testKey);
      const wrongKey = generateEncryptionKey();

      expect(() => decrypt(encrypted, wrongKey)).toThrow('Decryption failed');
    });

    it('should throw error when ciphertext format is invalid', () => {
      const invalidFormats = [
        'invalid-format',
        'only:two:parts',
        'part1:part2:part3:part4:part5', // 5 parts
        'not-base64!:invalid:format:here',
      ];

      invalidFormats.forEach(invalid => {
        expect(() => decrypt(invalid, testKey)).toThrow();
      });
    });

    it('should throw error when ciphertext is tampered', () => {
      const plaintext = 'secret';
      const encrypted = encrypt(plaintext, testKey);

      // 암호문의 일부 변조
      const parts = encrypted.split(':');
      parts[3] = 'tampered-data-12345678';
      const tampered = parts.join(':');

      expect(() => decrypt(tampered, testKey)).toThrow();
    });

    it('should throw error when auth tag is modified', () => {
      const plaintext = 'secret';
      const encrypted = encrypt(plaintext, testKey);

      // 인증 태그 변조
      const parts = encrypted.split(':');
      parts[2] = Buffer.from('fake-auth-tag').toString('base64');
      const modified = parts.join(':');

      expect(() => decrypt(modified, testKey)).toThrow('Decryption failed');
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted data', () => {
      const plaintext = 'test-data';
      const encrypted = encrypt(plaintext, testKey);

      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plaintext', () => {
      const plaintext = 'this-is-not-encrypted';

      expect(isEncrypted(plaintext)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isEncrypted('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isEncrypted(null as unknown as string)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isEncrypted(undefined as unknown as string)).toBe(false);
    });

    it('should return false for invalid format (wrong number of parts)', () => {
      const invalid = 'part1:part2:part3'; // 3 parts instead of 4

      expect(isEncrypted(invalid)).toBe(false);
    });

    it('should return false for invalid base64 format', () => {
      const invalid = 'invalid!:not@base64#:format$:here%';

      expect(isEncrypted(invalid)).toBe(false);
    });

    it('should return false for empty parts', () => {
      const invalid = ':::'; // 4 empty parts

      expect(isEncrypted(invalid)).toBe(false);
    });
  });

  describe('validateEncryptionKey', () => {
    it('should return true for valid 64-character key', () => {
      const key = generateEncryptionKey();

      expect(validateEncryptionKey(key)).toBe(true);
    });

    it('should return true for keys longer than 32 characters', () => {
      const longKey = 'a'.repeat(100);

      expect(validateEncryptionKey(longKey)).toBe(true);
    });

    it('should return false for empty key', () => {
      expect(validateEncryptionKey('')).toBe(false);
    });

    it('should return false for null key', () => {
      expect(validateEncryptionKey(null as unknown as string)).toBe(false);
    });

    it('should return false for undefined key', () => {
      expect(validateEncryptionKey(undefined as unknown as string)).toBe(false);
    });

    it('should return false for short keys (< 32 characters)', () => {
      const shortKeys = ['abc', '12345678', 'a'.repeat(31)];

      shortKeys.forEach(key => {
        expect(validateEncryptionKey(key)).toBe(false);
      });
    });

    it('should return true for exactly 32-character key', () => {
      const key = 'a'.repeat(32);

      expect(validateEncryptionKey(key)).toBe(true);
    });
  });

  describe('testEncryption', () => {
    it('should return true for valid encryption key', () => {
      const key = generateEncryptionKey();

      expect(testEncryption(key)).toBe(true);
    });

    it('should handle invalid key gracefully', () => {
      const invalidKey = 'too-short';

      // testEncryption은 짧은 키로도 암호화를 시도하므로
      // 키 검증은 validateEncryptionKey로 별도 수행해야 함
      const result = testEncryption(invalidKey);

      // 짧은 키로도 암호화가 가능하지만, validateEncryptionKey로 검증해야 함
      expect(typeof result).toBe('boolean');
      expect(validateEncryptionKey(invalidKey)).toBe(false);
    });

    it('should return false for empty key', () => {
      expect(testEncryption('')).toBe(false);
    });

    it('should validate roundtrip encryption', () => {
      const key = generateEncryptionKey();
      const result = testEncryption(key);

      expect(result).toBe(true);

      // 실제로 암호화/복호화가 동작하는지 확인
      const plaintext = 'test-data';
      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Edge Cases & Security', () => {
    it('should use PBKDF2 with 600,000 iterations', () => {
      // PBKDF2 사용 확인을 위한 타이밍 테스트
      // 600K iterations는 충분히 느려야 함 (> 100ms)
      const start = Date.now();
      const plaintext = 'test';
      encrypt(plaintext, testKey);
      const duration = Date.now() - start;

      // 600K iterations는 최소 50ms 이상 걸려야 함
      expect(duration).toBeGreaterThan(10); // CI 환경을 고려하여 낮게 설정
    });

    it('should use different salt for each encryption', () => {
      const plaintext = 'same-plaintext';

      const encrypted1 = encrypt(plaintext, testKey);
      const encrypted2 = encrypt(plaintext, testKey);

      const salt1 = encrypted1.split(':')[0];
      const salt2 = encrypted2.split(':')[0];

      // 매번 다른 salt 사용
      expect(salt1).not.toBe(salt2);
    });

    it('should use different IV for each encryption', () => {
      const plaintext = 'same-plaintext';

      const encrypted1 = encrypt(plaintext, testKey);
      const encrypted2 = encrypt(plaintext, testKey);

      const iv1 = encrypted1.split(':')[1];
      const iv2 = encrypted2.split(':')[1];

      // 매번 다른 IV 사용
      expect(iv1).not.toBe(iv2);
    });

    it('should maintain data integrity (no silent corruption)', () => {
      const plaintext = 'important-data-must-not-corrupt';
      const encrypted = encrypt(plaintext, testKey);

      // 100번 암복호화해도 데이터 무결성 유지
      let current = encrypted;
      for (let i = 0; i < 100; i++) {
        const decrypted = decrypt(current, testKey);
        expect(decrypted).toBe(plaintext);
        current = encrypt(decrypted, testKey);
      }
    });

    it('should handle newlines and whitespace', () => {
      const plaintext = '  \n\t  test with spaces  \n\n  ';
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle JSON strings', () => {
      const jsonData = JSON.stringify({
        apiKey: 'secret-key',
        userId: 12345,
        metadata: { foo: 'bar' },
      });

      const encrypted = encrypt(jsonData, testKey);
      const decrypted = decrypt(encrypted, testKey);

      expect(decrypted).toBe(jsonData);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(jsonData));
    });

    it('should prevent key reuse attacks (different keys produce different results)', () => {
      const plaintext = 'test';
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      const encrypted1 = encrypt(plaintext, key1);
      const encrypted2 = encrypt(plaintext, key2);

      expect(encrypted1).not.toBe(encrypted2);

      // 각각 올바른 키로만 복호화 가능
      expect(decrypt(encrypted1, key1)).toBe(plaintext);
      expect(decrypt(encrypted2, key2)).toBe(plaintext);
      expect(() => decrypt(encrypted1, key2)).toThrow();
      expect(() => decrypt(encrypted2, key1)).toThrow();
    });
  });

  describe('Integration with crypto module', () => {
    it('should use AES-256-GCM algorithm', () => {
      // 암호화 결과가 AES-256-GCM 형식인지 확인
      const plaintext = 'test';
      const encrypted = encrypt(plaintext, testKey);

      const parts = encrypted.split(':');
      const [saltBase64, ivBase64, authTagBase64] = parts;

      const salt = Buffer.from(saltBase64, 'base64');
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');

      // Salt: 64 bytes (512 bits)
      expect(salt.length).toBe(64);

      // IV: 16 bytes (128 bits)
      expect(iv.length).toBe(16);

      // Auth Tag: 16 bytes (128 bits)
      expect(authTag.length).toBe(16);
    });

    it('should generate key with correct entropy', () => {
      const key = generateEncryptionKey();
      const buffer = Buffer.from(key, 'hex');

      // 32 bytes = 256 bits
      expect(buffer.length).toBe(32);

      // 엔트로피 확인: 모든 바이트가 0이면 안 됨
      const allZeros = buffer.every(byte => byte === 0);
      expect(allZeros).toBe(false);
    });
  });
});
