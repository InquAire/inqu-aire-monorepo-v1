#!/usr/bin/env ts-node

/**
 * 암호화 키 생성 스크립트
 *
 * AES-256-GCM 암호화를 위한 안전한 256비트 키를 생성합니다.
 *
 * Usage:
 *   pnpm tsx scripts/generate-encryption-key.ts
 *
 * 생성된 키를 .env 파일에 ENCRYPTION_KEY로 추가하세요:
 *   ENCRYPTION_KEY=<generated-key>
 */

import { generateEncryptionKey } from '../src/common/utils/encryption.util';

function main() {
  console.log('\n🔐 Generating encryption key for API Key encryption...\n');

  const key = generateEncryptionKey();

  console.log('✅ Encryption key generated successfully!\n');
  console.log('📋 Add this to your .env file:\n');
  console.log(`ENCRYPTION_KEY=${key}\n`);
  console.log('⚠️  IMPORTANT:');
  console.log('   - Keep this key secure and never commit it to version control');
  console.log('   - Store it in AWS Secrets Manager or similar for production');
  console.log('   - If you lose this key, you will NOT be able to decrypt existing data');
  console.log('   - Backup this key in a secure location\n');
  console.log('📝 Key length:', key.length, 'characters (256 bits)\n');
}

main();
