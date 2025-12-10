#!/usr/bin/env ts-node

/**
 * API Key 암호화 마이그레이션 스크립트
 *
 * 데이터베이스의 평문 API Key를 암호화합니다.
 * - Channel 테이블의 access_token, refresh_token
 *
 * Usage:
 *   pnpm tsx scripts/migrate-encrypt-tokens.ts [--dry-run]
 *
 * Options:
 *   --dry-run: 실제 업데이트 없이 마이그레이션 시뮬레이션만 수행
 *
 * Prerequisites:
 *   - ENCRYPTION_KEY가 .env에 설정되어 있어야 함
 *   - 데이터베이스 백업 권장
 */

import { PrismaClient } from '@prisma/generated';
import * as dotenv from 'dotenv';

import { encrypt, isEncrypted } from '../src/common/utils/encryption.util';

// .env 파일 로드
dotenv.config();

const prisma = new PrismaClient();

interface MigrationStats {
  total: number;
  alreadyEncrypted: number;
  encrypted: number;
  errors: number;
}

async function migrateChannelTokens(dryRun: boolean): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: 0,
    alreadyEncrypted: 0,
    encrypted: 0,
    errors: 0,
  };

  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY is not set in environment variables');
  }

  console.log('\n🔍 Fetching all channels...');

  const channels = await prisma.channel.findMany({
    where: {
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      platform: true,
      access_token: true,
      refresh_token: true,
    },
  });

  stats.total = channels.length;

  console.log(`📊 Found ${stats.total} channels\n`);

  for (const channel of channels) {
    console.log(`\n📍 Processing channel: ${channel.id} (${channel.name} - ${channel.platform})`);

    try {
      let needsUpdate = false;
      const updateData: {
        access_token?: string;
        refresh_token?: string;
        updated_at: Date;
      } = {
        updated_at: new Date(),
      };

      // Access Token 확인
      if (channel.access_token) {
        if (isEncrypted(channel.access_token)) {
          console.log('   ✓ access_token: Already encrypted');
          stats.alreadyEncrypted++;
        } else {
          console.log('   🔐 access_token: Encrypting...');
          updateData.access_token = encrypt(channel.access_token, encryptionKey);
          needsUpdate = true;
          stats.encrypted++;
        }
      } else {
        console.log('   - access_token: NULL (skipped)');
      }

      // Refresh Token 확인
      if (channel.refresh_token) {
        if (isEncrypted(channel.refresh_token)) {
          console.log('   ✓ refresh_token: Already encrypted');
          if (updateData.access_token) {
            // access_token만 암호화된 경우는 카운트하지 않음
          } else {
            stats.alreadyEncrypted++;
          }
        } else {
          console.log('   🔐 refresh_token: Encrypting...');
          updateData.refresh_token = encrypt(channel.refresh_token, encryptionKey);
          needsUpdate = true;
          if (!updateData.access_token) {
            // refresh_token만 암호화된 경우만 카운트
            stats.encrypted++;
          }
        }
      } else {
        console.log('   - refresh_token: NULL (skipped)');
      }

      // 업데이트 필요한 경우
      if (needsUpdate) {
        if (dryRun) {
          console.log('   🚧 [DRY RUN] Would update channel');
        } else {
          await prisma.channel.update({
            where: { id: channel.id },
            data: updateData,
          });
          console.log('   ✅ Updated successfully');
        }
      } else {
        console.log('   ⏭️  No update needed');
      }
    } catch (error) {
      stats.errors++;
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return stats;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║     🔐 API Key Encryption Migration Script              ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('🚧 Running in DRY RUN mode - no data will be modified\n');
  } else {
    console.log('⚠️  WARNING: This will modify your database!');
    console.log('   Make sure you have a backup before proceeding.\n');

    // 5초 대기
    console.log('   Starting in 5 seconds... (Ctrl+C to cancel)');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('\n');
  }

  try {
    const stats = await migrateChannelTokens(dryRun);

    console.log('\n\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                    Migration Summary                     ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    console.log(`   Total channels:         ${stats.total}`);
    console.log(`   Already encrypted:      ${stats.alreadyEncrypted}`);
    console.log(`   Newly encrypted:        ${stats.encrypted}`);
    console.log(`   Errors:                 ${stats.errors}`);

    if (dryRun) {
      console.log('\n🚧 DRY RUN completed - no data was modified');
      console.log('   Run without --dry-run to apply changes\n');
    } else {
      console.log('\n✅ Migration completed successfully!\n');
    }

    if (stats.errors > 0) {
      console.log('⚠️  Some errors occurred during migration. Please review the logs above.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    console.error('\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
