#!/usr/bin/env tsx

/**
 * 암호화 키 로테이션 스크립트
 *
 * ENCRYPTION_KEY를 안전하게 로테이션하고 모든 암호화된 데이터를 재암호화합니다.
 *
 * 사용법:
 *   1. 새 암호화 키 생성:
 *      pnpm generate:encryption-key
 *
 *   2. 환경 변수 설정:
 *      ENCRYPTION_KEY_OLD=<현재 키>
 *      ENCRYPTION_KEY_NEW=<새 키>
 *
 *   3. Dry run으로 테스트:
 *      pnpm rotate:encryption-key:dry-run
 *
 *   4. 실제 로테이션 실행:
 *      pnpm rotate:encryption-key
 *
 * 주의사항:
 *   - 반드시 데이터베이스 백업 후 실행
 *   - 프로덕션 환경에서는 점검 시간에 실행 권장
 *   - 로테이션 중에는 서비스 일시 중단 필요
 */

import { PrismaClient } from '@prisma/generated';

import { decrypt, encrypt, isEncrypted } from '../src/common/utils/encryption.util';

// ============================================
// 설정
// ============================================

const isDryRun = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

const oldKey = process.env.ENCRYPTION_KEY_OLD;
const newKey = process.env.ENCRYPTION_KEY_NEW;

// ============================================
// 유틸리티 함수
// ============================================

function validateEnvironment() {
  console.log('🔍 환경 변수 검증 중...\n');

  if (!oldKey || oldKey.length === 0) {
    console.error('❌ ENCRYPTION_KEY_OLD가 설정되지 않았습니다.');
    console.error('   현재 사용 중인 암호화 키를 ENCRYPTION_KEY_OLD에 설정하세요.\n');
    process.exit(1);
  }

  if (!newKey || newKey.length === 0) {
    console.error('❌ ENCRYPTION_KEY_NEW가 설정되지 않았습니다.');
    console.error('   새로운 암호화 키를 ENCRYPTION_KEY_NEW에 설정하세요.');
    console.error('   생성: pnpm generate:encryption-key\n');
    process.exit(1);
  }

  // 키 길이 검증 (64자 16진수 = 32바이트)
  if (oldKey.length !== 64) {
    console.error('❌ ENCRYPTION_KEY_OLD의 길이가 올바르지 않습니다.');
    console.error(`   예상: 64자, 실제: ${oldKey.length}자\n`);
    process.exit(1);
  }

  if (newKey.length !== 64) {
    console.error('❌ ENCRYPTION_KEY_NEW의 길이가 올바르지 않습니다.');
    console.error(`   예상: 64자, 실제: ${newKey.length}자\n`);
    process.exit(1);
  }

  // 키가 동일하지 않은지 확인
  if (oldKey === newKey) {
    console.error('❌ ENCRYPTION_KEY_OLD와 ENCRYPTION_KEY_NEW가 동일합니다.');
    console.error('   새로운 키를 생성하세요: pnpm generate:encryption-key\n');
    process.exit(1);
  }

  console.log('✅ 환경 변수 검증 완료\n');
  console.log(`   OLD KEY: ${oldKey.substring(0, 8)}...${oldKey.substring(56)}`);
  console.log(`   NEW KEY: ${newKey.substring(0, 8)}...${newKey.substring(56)}\n`);
}

async function confirmRotation() {
  if (isDryRun) {
    console.log('🚧 DRY RUN 모드: 실제 데이터베이스는 변경되지 않습니다.\n');
    return;
  }

  console.log('⚠️  경고: 이 작업은 데이터베이스의 암호화된 데이터를 모두 재암호화합니다!');
  console.log('   - 반드시 데이터베이스 백업을 먼저 수행하세요.');
  console.log('   - 로테이션 중에는 서비스를 일시 중단하세요.');
  console.log('   - 실패 시 ENCRYPTION_KEY_OLD로 롤백할 수 있습니다.\n');

  console.log('   5초 후 자동으로 시작됩니다... (Ctrl+C로 취소)\n');

  await new Promise(resolve => setTimeout(resolve, 5000));
}

async function rotateChannelTokens() {
  console.log('📍 Channel 테이블 암호화 키 로테이션 시작...\n');

  const channels = await prisma.channel.findMany({
    select: {
      id: true,
      name: true,
      platform: true,
      access_token: true,
      refresh_token: true,
    },
  });

  console.log(`   총 ${channels.length}개 채널 발견\n`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const channel of channels) {
    try {
      console.log(`   🔄 Processing: ${channel.id} (${channel.name} - ${channel.platform})`);

      const updateData: {
        access_token?: string;
        refresh_token?: string;
      } = {};

      // Access Token 재암호화
      if (channel.access_token && isEncrypted(channel.access_token)) {
        try {
          // oldKey와 newKey는 validateEnvironment()에서 이미 검증됨
          const decrypted = decrypt(channel.access_token, oldKey!);
          const reencrypted = encrypt(decrypted, newKey!);
          updateData.access_token = reencrypted;
          console.log(`      ✓ access_token 재암호화 완료`);
        } catch (error) {
          console.error(`      ✗ access_token 재암호화 실패:`, error);
          throw error;
        }
      } else if (channel.access_token) {
        console.log(`      ⚠ access_token이 이미 평문이거나 다른 키로 암호화됨`);
      }

      // Refresh Token 재암호화
      if (channel.refresh_token && isEncrypted(channel.refresh_token)) {
        try {
          // oldKey와 newKey는 validateEnvironment()에서 이미 검증됨
          const decrypted = decrypt(channel.refresh_token, oldKey!);
          const reencrypted = encrypt(decrypted, newKey!);
          updateData.refresh_token = reencrypted;
          console.log(`      ✓ refresh_token 재암호화 완료`);
        } catch (error) {
          console.error(`      ✗ refresh_token 재암호화 실패:`, error);
          throw error;
        }
      } else if (channel.refresh_token) {
        console.log(`      ⚠ refresh_token이 이미 평문이거나 다른 키로 암호화됨`);
      }

      // 데이터베이스 업데이트
      if (Object.keys(updateData).length > 0) {
        if (!isDryRun) {
          await prisma.channel.update({
            where: { id: channel.id },
            data: updateData,
          });
          console.log(`      ✅ 데이터베이스 업데이트 완료\n`);
        } else {
          console.log(`      🚧 [DRY RUN] 데이터베이스 업데이트 생략\n`);
        }
        successCount++;
      } else {
        console.log(`      ⏭️  업데이트할 데이터 없음\n`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`      ❌ Error processing channel ${channel.id}:`, error);
      errorCount++;
      console.log();
    }
  }

  return { successCount, errorCount, skippedCount };
}

async function printSummary(stats: {
  successCount: number;
  errorCount: number;
  skippedCount: number;
}) {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║              암호화 키 로테이션 완료                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  console.log(
    `   총 채널 수:         ${stats.successCount + stats.errorCount + stats.skippedCount}`
  );
  console.log(`   재암호화 성공:      ${stats.successCount}`);
  console.log(`   스킵됨:             ${stats.skippedCount}`);
  console.log(`   에러 발생:          ${stats.errorCount}\n`);

  if (isDryRun) {
    console.log('🚧 DRY RUN 완료 - 실제 데이터는 변경되지 않았습니다.\n');
    console.log('   실제 로테이션을 실행하려면:');
    console.log('   pnpm rotate:encryption-key\n');
  } else if (stats.errorCount === 0) {
    console.log('✅ 모든 데이터가 성공적으로 재암호화되었습니다!\n');
    console.log('   다음 단계:');
    console.log('   1. 환경 변수 업데이트:');
    console.log('      ENCRYPTION_KEY=<NEW_KEY>');
    console.log('      (ENCRYPTION_KEY_OLD, ENCRYPTION_KEY_NEW 제거)\n');
    console.log('   2. 애플리케이션 재시작\n');
    console.log('   3. 복호화 테스트 수행\n');
    console.log('   4. OLD_KEY 안전하게 백업 후 폐기\n');
  } else {
    console.log('⚠️  일부 채널에서 에러가 발생했습니다.');
    console.log('   에러가 발생한 채널을 수동으로 확인하세요.\n');
    console.log('   롤백이 필요한 경우:');
    console.log('   ENCRYPTION_KEY=<OLD_KEY>로 설정하여 서비스 재시작\n');
  }
}

// ============================================
// 메인 함수
// ============================================

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║          암호화 키 로테이션 스크립트                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  try {
    // 1. 환경 변수 검증
    validateEnvironment();

    // 2. 사용자 확인
    await confirmRotation();

    // 3. Channel 테이블 재암호화
    const stats = await rotateChannelTokens();

    // 4. 결과 요약
    await printSummary(stats);
  } catch (error) {
    console.error('\n❌ 암호화 키 로테이션 실패:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// 스크립트 실행
// ============================================

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
