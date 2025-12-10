/**
 * EncryptionService Unit Tests
 *
 * 테스트 범위:
 * - 모듈 초기화 및 키 검증
 * - 암호화/복호화
 * - 조건부 암호화
 * - 다중 필드 암호화/복호화
 * - 에러 핸들링
 */

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { EncryptionService } from './encryption.service';

import * as encryptionUtil from '@/common/utils/encryption.util';

// Mock encryption utilities
jest.mock('@/common/utils/encryption.util', () => ({
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  isEncrypted: jest.fn(),
  validateEncryptionKey: jest.fn(),
  testEncryption: jest.fn(),
  generateEncryptionKey: jest.fn(),
}));

describe('EncryptionService', () => {
  let service: EncryptionService;
  let configService: ConfigService;

  const validKey = 'a'.repeat(64); // 64-character key
  const mockPlaintext = 'my-secret-api-key';
  const mockCiphertext = 'encrypted:iv:authtag:ciphertext';

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    (encryptionUtil.validateEncryptionKey as jest.Mock).mockReturnValue(true);
    (encryptionUtil.testEncryption as jest.Mock).mockReturnValue(true);
    (encryptionUtil.encrypt as jest.Mock).mockReturnValue(mockCiphertext);
    (encryptionUtil.decrypt as jest.Mock).mockReturnValue(mockPlaintext);
    (encryptionUtil.isEncrypted as jest.Mock).mockReturnValue(true);
    (encryptionUtil.generateEncryptionKey as jest.Mock).mockReturnValue(validKey);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(validKey),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('onModuleInit', () => {
    it('should initialize successfully with valid encryption key', async () => {
      await expect(service.onModuleInit()).resolves.not.toThrow();

      expect(encryptionUtil.validateEncryptionKey).toHaveBeenCalledWith(validKey);
      expect(encryptionUtil.testEncryption).toHaveBeenCalledWith(validKey);
    });

    it('should throw error if ENCRYPTION_KEY is not set', async () => {
      (configService.get as jest.Mock).mockReturnValue('');

      const newService = new EncryptionService(configService);

      await expect(newService.onModuleInit()).rejects.toThrow('ENCRYPTION_KEY is required');
    });

    it('should throw error if ENCRYPTION_KEY is invalid', async () => {
      (encryptionUtil.validateEncryptionKey as jest.Mock).mockReturnValue(false);

      await expect(service.onModuleInit()).rejects.toThrow('Invalid ENCRYPTION_KEY');
    });

    it('should throw error if encryption test fails', async () => {
      (encryptionUtil.testEncryption as jest.Mock).mockReturnValue(false);

      await expect(service.onModuleInit()).rejects.toThrow('Encryption test failed');
    });

    it('should validate key on module initialization', async () => {
      await service.onModuleInit();

      expect(encryptionUtil.validateEncryptionKey).toHaveBeenCalledTimes(1);
      expect(encryptionUtil.testEncryption).toHaveBeenCalledTimes(1);
    });
  });

  describe('encrypt', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should encrypt plaintext successfully', () => {
      const result = service.encrypt(mockPlaintext);

      expect(result).toBe(mockCiphertext);
      expect(encryptionUtil.encrypt).toHaveBeenCalledWith(mockPlaintext, validKey);
    });

    it('should return empty string for empty input', () => {
      const result = service.encrypt('');

      expect(result).toBe('');
      expect(encryptionUtil.encrypt).not.toHaveBeenCalled();
    });

    it('should handle encryption errors and rethrow', () => {
      const error = new Error('Encryption failed');
      (encryptionUtil.encrypt as jest.Mock).mockImplementation(() => {
        throw error;
      });

      expect(() => service.encrypt(mockPlaintext)).toThrow('Encryption failed');
    });

    it('should encrypt special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      service.encrypt(specialChars);

      expect(encryptionUtil.encrypt).toHaveBeenCalledWith(specialChars, validKey);
    });

    it('should encrypt unicode characters', () => {
      const unicode = '한글 테스트 🔐 émojis';
      service.encrypt(unicode);

      expect(encryptionUtil.encrypt).toHaveBeenCalledWith(unicode, validKey);
    });
  });

  describe('decrypt', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should decrypt ciphertext successfully', () => {
      const result = service.decrypt(mockCiphertext);

      expect(result).toBe(mockPlaintext);
      expect(encryptionUtil.decrypt).toHaveBeenCalledWith(mockCiphertext, validKey);
    });

    it('should return empty string for empty input', () => {
      const result = service.decrypt('');

      expect(result).toBe('');
      expect(encryptionUtil.decrypt).not.toHaveBeenCalled();
    });

    it('should handle decryption errors and rethrow', () => {
      const error = new Error('Decryption failed');
      (encryptionUtil.decrypt as jest.Mock).mockImplementation(() => {
        throw error;
      });

      expect(() => service.decrypt(mockCiphertext)).toThrow('Decryption failed');
    });

    it('should decrypt and return original special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      (encryptionUtil.decrypt as jest.Mock).mockReturnValue(specialChars);

      const result = service.decrypt(mockCiphertext);

      expect(result).toBe(specialChars);
    });
  });

  describe('isEncrypted', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return true for encrypted data', () => {
      (encryptionUtil.isEncrypted as jest.Mock).mockReturnValue(true);

      const result = service.isEncrypted(mockCiphertext);

      expect(result).toBe(true);
      expect(encryptionUtil.isEncrypted).toHaveBeenCalledWith(mockCiphertext);
    });

    it('should return false for plaintext', () => {
      (encryptionUtil.isEncrypted as jest.Mock).mockReturnValue(false);

      const result = service.isEncrypted('plaintext');

      expect(result).toBe(false);
    });

    it('should handle empty string', () => {
      (encryptionUtil.isEncrypted as jest.Mock).mockReturnValue(false);

      const result = service.isEncrypted('');

      expect(result).toBe(false);
    });
  });

  describe('encryptIfNeeded', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should encrypt data if not already encrypted', () => {
      (encryptionUtil.isEncrypted as jest.Mock).mockReturnValue(false);
      (encryptionUtil.encrypt as jest.Mock).mockReturnValue(mockCiphertext);

      const result = service.encryptIfNeeded(mockPlaintext);

      expect(result).toBe(mockCiphertext);
      expect(encryptionUtil.encrypt).toHaveBeenCalledWith(mockPlaintext, validKey);
    });

    it('should return data as-is if already encrypted', () => {
      (encryptionUtil.isEncrypted as jest.Mock).mockReturnValue(true);

      const result = service.encryptIfNeeded(mockCiphertext);

      expect(result).toBe(mockCiphertext);
      expect(encryptionUtil.encrypt).not.toHaveBeenCalled();
    });

    it('should return null for null input', () => {
      const result = service.encryptIfNeeded(null);

      expect(result).toBe(null);
      expect(encryptionUtil.isEncrypted).not.toHaveBeenCalled();
      expect(encryptionUtil.encrypt).not.toHaveBeenCalled();
    });

    it('should return null for undefined input', () => {
      const result = service.encryptIfNeeded(undefined);

      expect(result).toBe(null);
      expect(encryptionUtil.isEncrypted).not.toHaveBeenCalled();
      expect(encryptionUtil.encrypt).not.toHaveBeenCalled();
    });

    it('should return null for empty string', () => {
      const result = service.encryptIfNeeded('');

      expect(result).toBe(null);
      expect(encryptionUtil.isEncrypted).not.toHaveBeenCalled();
      expect(encryptionUtil.encrypt).not.toHaveBeenCalled();
    });
  });

  describe('generateKey (static method)', () => {
    it('should generate encryption key', () => {
      const key = EncryptionService.generateKey();

      expect(key).toBe(validKey);
      expect(encryptionUtil.generateEncryptionKey).toHaveBeenCalled();
    });

    it('should generate unique keys on each call', () => {
      (encryptionUtil.generateEncryptionKey as jest.Mock)
        .mockReturnValueOnce('key1')
        .mockReturnValueOnce('key2');

      const key1 = EncryptionService.generateKey();
      const key2 = EncryptionService.generateKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('encryptFields', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should encrypt specified fields in object', () => {
      const data = {
        accessToken: 'plain-access-token',
        refreshToken: 'plain-refresh-token',
        userId: '12345',
        metadata: { foo: 'bar' },
      };

      (encryptionUtil.encrypt as jest.Mock)
        .mockReturnValueOnce('encrypted-access')
        .mockReturnValueOnce('encrypted-refresh');

      const result = service.encryptFields(data, ['accessToken', 'refreshToken']);

      expect(result.accessToken).toBe('encrypted-access');
      expect(result.refreshToken).toBe('encrypted-refresh');
      expect(result.userId).toBe('12345'); // Not encrypted
      expect(result.metadata).toEqual({ foo: 'bar' }); // Not encrypted
    });

    it('should only encrypt string fields', () => {
      const data = {
        token: 'secret',
        count: 42,
        active: true,
        metadata: { foo: 'bar' },
      };

      (encryptionUtil.encrypt as jest.Mock).mockReturnValue('encrypted-token');

      const result = service.encryptFields(data, ['token', 'count', 'active', 'metadata']);

      expect(result.token).toBe('encrypted-token');
      expect(result.count).toBe(42); // Number not encrypted
      expect(result.active).toBe(true); // Boolean not encrypted
      expect(result.metadata).toEqual({ foo: 'bar' }); // Object not encrypted
    });

    it('should not mutate original object', () => {
      const original = {
        token: 'secret',
        userId: '123',
      };

      (encryptionUtil.encrypt as jest.Mock).mockReturnValue('encrypted-token');

      const result = service.encryptFields(original, ['token']);

      expect(original.token).toBe('secret'); // Original unchanged
      expect(result.token).toBe('encrypted-token'); // Result encrypted
    });

    it('should handle empty fields array', () => {
      const data = { token: 'secret' };

      const result = service.encryptFields(data, []);

      expect(result).toEqual(data);
      expect(encryptionUtil.encrypt).not.toHaveBeenCalled();
    });
  });

  describe('decryptFields', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should decrypt specified fields in object', () => {
      const data = {
        accessToken: 'encrypted-access',
        refreshToken: 'encrypted-refresh',
        userId: '12345',
      };

      (encryptionUtil.isEncrypted as jest.Mock).mockReturnValue(true);
      (encryptionUtil.decrypt as jest.Mock)
        .mockReturnValueOnce('plain-access-token')
        .mockReturnValueOnce('plain-refresh-token');

      const result = service.decryptFields(data, ['accessToken', 'refreshToken']);

      expect(result.accessToken).toBe('plain-access-token');
      expect(result.refreshToken).toBe('plain-refresh-token');
      expect(result.userId).toBe('12345'); // Not decrypted
    });

    it('should only decrypt string fields that are encrypted', () => {
      const data = {
        token: 'encrypted',
        plainToken: 'plain-text',
        count: 42,
      };

      (encryptionUtil.isEncrypted as jest.Mock)
        .mockReturnValueOnce(true) // token is encrypted
        .mockReturnValueOnce(false); // plainToken is not encrypted

      (encryptionUtil.decrypt as jest.Mock).mockReturnValue('decrypted-token');

      const result = service.decryptFields(data, ['token', 'plainToken', 'count']);

      expect(result.token).toBe('decrypted-token');
      expect(result.plainToken).toBe('plain-text'); // Not encrypted, left as-is
      expect(result.count).toBe(42); // Number, left as-is
    });

    it('should handle decryption errors gracefully', () => {
      const data = {
        token1: 'encrypted1',
        token2: 'encrypted2',
      };

      (encryptionUtil.isEncrypted as jest.Mock).mockReturnValue(true);
      (encryptionUtil.decrypt as jest.Mock)
        .mockImplementationOnce(() => {
          throw new Error('Decryption failed');
        })
        .mockReturnValueOnce('decrypted2');

      const result = service.decryptFields(data, ['token1', 'token2']);

      // token1 decryption failed, should keep original
      expect(result.token1).toBe('encrypted1');
      // token2 decryption succeeded
      expect(result.token2).toBe('decrypted2');
    });

    it('should not mutate original object', () => {
      const original = {
        token: 'encrypted',
        userId: '123',
      };

      (encryptionUtil.isEncrypted as jest.Mock).mockReturnValue(true);
      (encryptionUtil.decrypt as jest.Mock).mockReturnValue('plain-token');

      const result = service.decryptFields(original, ['token']);

      expect(original.token).toBe('encrypted'); // Original unchanged
      expect(result.token).toBe('plain-token'); // Result decrypted
    });

    it('should handle empty fields array', () => {
      const data = { token: 'encrypted' };

      const result = service.decryptFields(data, []);

      expect(result).toEqual(data);
      expect(encryptionUtil.decrypt).not.toHaveBeenCalled();
    });

    it('should handle mixed encrypted and plaintext data during migration', () => {
      const data = {
        oldToken: 'plaintext-not-encrypted-yet', // Migration scenario
        newToken: 'encrypted:data',
      };

      (encryptionUtil.isEncrypted as jest.Mock)
        .mockReturnValueOnce(false) // oldToken not encrypted
        .mockReturnValueOnce(true); // newToken is encrypted

      (encryptionUtil.decrypt as jest.Mock).mockReturnValue('decrypted-new-token');

      const result = service.decryptFields(data, ['oldToken', 'newToken']);

      expect(result.oldToken).toBe('plaintext-not-encrypted-yet'); // Left as-is
      expect(result.newToken).toBe('decrypted-new-token'); // Decrypted
    });
  });

  describe('Edge Cases & Integration', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should handle roundtrip encryption/decryption', () => {
      const original = 'my-secret-data';
      const encrypted = 'encrypted:secret';

      (encryptionUtil.encrypt as jest.Mock).mockReturnValue(encrypted);
      (encryptionUtil.decrypt as jest.Mock).mockReturnValue(original);

      const encryptedData = service.encrypt(original);
      const decryptedData = service.decrypt(encryptedData);

      expect(decryptedData).toBe(original);
    });

    it('should use encryption key from ConfigService', () => {
      expect(configService.get).toHaveBeenCalledWith('ENCRYPTION_KEY', '');
    });

    it('should handle very long strings', () => {
      const longString = 'x'.repeat(10000);

      service.encrypt(longString);

      expect(encryptionUtil.encrypt).toHaveBeenCalledWith(longString, validKey);
    });

    it('should handle JSON strings', () => {
      const jsonData = JSON.stringify({
        apiKey: 'secret',
        metadata: { foo: 'bar' },
      });

      service.encrypt(jsonData);

      expect(encryptionUtil.encrypt).toHaveBeenCalledWith(jsonData, validKey);
    });

    it('should encrypt multiple fields in batch efficiently', () => {
      const data = {
        token1: 'secret1',
        token2: 'secret2',
        token3: 'secret3',
      };

      service.encryptFields(data, ['token1', 'token2', 'token3']);

      expect(encryptionUtil.encrypt).toHaveBeenCalledTimes(3);
    });

    it('should decrypt multiple fields in batch efficiently', () => {
      const data = {
        token1: 'encrypted1',
        token2: 'encrypted2',
        token3: 'encrypted3',
      };

      (encryptionUtil.isEncrypted as jest.Mock).mockReturnValue(true);

      service.decryptFields(data, ['token1', 'token2', 'token3']);

      expect(encryptionUtil.decrypt).toHaveBeenCalledTimes(3);
    });
  });
});
