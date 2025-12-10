# Prisma Seed

이 디렉토리는 데이터베이스 초기 데이터 생성을 위한 seed 스크립트를 포함합니다.

## 📁 구조

```
seed/
├── index.ts                 # 메인 진입점
├── data/
│   └── templates.ts        # 문의 템플릿 및 상수 데이터
├── seeders/
│   ├── users.ts            # 사용자 데이터 생성
│   ├── businesses.ts       # 사업체 데이터 생성
│   ├── channels.ts         # 채널 데이터 생성
│   ├── customers.ts        # 고객 데이터 생성
│   ├── inquiries.ts        # 문의 및 답변 데이터 생성
│   ├── templates.ts        # 답변 템플릿 데이터 생성
│   ├── subscriptions.ts    # 구독 및 결제 데이터 생성
│   └── stats.ts            # 통계 데이터 생성
└── utils/
    └── clear.ts            # 데이터베이스 초기화 유틸리티
```

## 🚀 사용법

### 전체 데이터 생성

```bash
pnpm seed
```

### 개별 모듈 실행

각 seeder는 독립적으로 실행할 수 있도록 설계되었습니다:

```typescript
import { PrismaClient } from '../generated';
import { seedUsers } from './seeders/users';

const prisma = new PrismaClient();

async function main() {
  const users = await seedUsers(prisma);
  console.log(`Created ${users.length} users`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## 📊 생성되는 데이터

### 사용자 (Users)
- 1명의 슈퍼 관리자
- 5명의 일반 사용자 (각 업종별 사업주)

**로그인 정보:**
- 관리자: `admin@inquaire.com` / `password123!`
- 사용자: `kim@dental.com`, `lee@derma.com`, 등 / `password123!`

### 사업체 (Businesses)
- 6개의 사업체 (치과, 피부과, 부동산, 병원, 미용실 등)
- 각 사업체는 주소, 전화번호, 웹사이트 포함

### 채널 (Channels)
- 10개의 채널 (카카오톡, LINE)
- 각 사업체당 1-2개의 채널
- Webhook URL 및 시크릿 자동 생성

### 고객 (Customers)
- 90명의 고객 (각 사업체당 15명)
- 연락처, 태그, 문의 이력 포함

### 문의 (Inquiries)
- 약 270-280개의 문의
- 다양한 상태 (NEW, IN_PROGRESS, COMPLETED, ON_HOLD)
- AI 분석 결과 포함 (유형, 감정, 긴급도)
- 업종별 특화 문의 내용

### 답변 템플릿 (Reply Templates)
- 18개의 답변 템플릿 (각 사업체당 3개)
- 변수 치환 기능 포함

### 구독 및 결제 (Subscriptions & Payments)
- 6개의 구독 (TRIAL, BASIC, PRO, ENTERPRISE)
- 3개의 결제 이력

### 통계 (Daily Stats)
- 180개의 일별 통계 레코드 (각 사업체당 30일)

## 🔧 커스터마이징

### 문의 템플릿 추가

`data/templates.ts`에서 업종별 문의 템플릿을 추가/수정할 수 있습니다:

```typescript
export const inquiryTemplates = {
  DENTAL: [
    {
      text: '새로운 문의 내용',
      type: '문의 유형',
      sentiment: 'POSITIVE/NEUTRAL/NEGATIVE',
      urgency: 'HIGH/MEDIUM/LOW',
    },
    // ...
  ],
  // ...
};
```

### 데이터 양 조절

각 seeder 파일에서 생성되는 데이터 양을 조절할 수 있습니다:

- **고객 수**: `seeders/customers.ts`의 `for (let i = 0; i < 15; i++)` 부분 수정
- **문의 수**: `seeders/inquiries.ts`의 `numInquiries` 계산 로직 수정
- **통계 기간**: `seeders/stats.ts`의 `for (let i = 0; i < 30; i++)` 부분 수정

### 새로운 Seeder 추가

1. `seeders/` 디렉토리에 새 파일 생성
2. Seeder 함수 작성:

```typescript
import type { PrismaClient } from '../../generated';

export async function seedNewEntity(prisma: PrismaClient) {
  console.log('🔨 Creating new entity...');

  // 데이터 생성 로직

  console.log('✅ Created entities');
  return entities;
}
```

3. `index.ts`에 import 및 실행 추가

## 🔄 재실행

Seed는 매번 데이터베이스를 초기화한 후 새 데이터를 생성합니다.
기존 데이터를 유지하고 싶다면 `utils/clear.ts`의 `clearDatabase` 함수를 수정하세요.

## 📝 참고사항

- bcrypt를 사용하여 비밀번호를 해싱합니다
- 모든 날짜는 현재 시간 기준으로 계산됩니다
- 랜덤 데이터를 사용하여 실제와 유사한 패턴을 만듭니다
- 외래 키 관계가 올바르게 설정됩니다
