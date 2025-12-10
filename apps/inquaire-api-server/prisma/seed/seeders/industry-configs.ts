import type { IndustryConfig, PrismaClient } from '../../generated';

export async function seedIndustryConfigs(prisma: PrismaClient): Promise<IndustryConfig[]> {
  console.log('🏭 Creating industry configs...');

  const configs = await Promise.all([
    prisma.industryConfig.create({
      data: {
        industry: 'DENTAL',
        display_name: '치과',
        inquiry_types: {
          types: [
            { code: 'RESERVATION', name: '예약 문의', description: '진료 예약 관련 문의' },
            { code: 'PRICE', name: '비용 문의', description: '치료 비용 관련 문의' },
            { code: 'TREATMENT', name: '치료 문의', description: '치료 방법 관련 문의' },
            { code: 'LOCATION', name: '위치 문의', description: '병원 위치/주차 관련 문의' },
            { code: 'HOURS', name: '운영시간 문의', description: '진료 시간 관련 문의' },
            { code: 'INSURANCE', name: '보험 문의', description: '의료보험 적용 관련 문의' },
            { code: 'OTHER', name: '기타', description: '기타 문의' },
          ],
        },
        system_prompt: `당신은 친절한 치과 상담 AI 어시스턴트입니다.
환자분들의 문의에 전문적이고 친절하게 답변해 주세요.
의료 관련 조언은 일반적인 정보만 제공하고, 정확한 진단은 내원 상담을 권유하세요.
예약 관련 문의는 가능한 시간대를 안내하고, 비용 문의는 대략적인 범위를 안내해 주세요.`,
        extraction_schema: {
          fields: [
            { name: 'preferred_date', type: 'date', description: '희망 예약 날짜' },
            { name: 'preferred_time', type: 'time', description: '희망 예약 시간' },
            { name: 'treatment_type', type: 'string', description: '원하는 치료 종류' },
            { name: 'symptoms', type: 'array', description: '증상 목록' },
            { name: 'contact', type: 'string', description: '연락처' },
          ],
        },
        default_templates: {
          greeting: '안녕하세요! {business_name}입니다. 무엇을 도와드릴까요?',
          reservation_confirm: '예약이 확인되었습니다. {date} {time}에 방문 부탁드립니다.',
        },
      },
    }),
    prisma.industryConfig.create({
      data: {
        industry: 'DERMATOLOGY',
        display_name: '피부과',
        inquiry_types: {
          types: [
            { code: 'RESERVATION', name: '예약 문의', description: '시술 예약 관련 문의' },
            { code: 'PRICE', name: '비용 문의', description: '시술 비용 관련 문의' },
            { code: 'PROCEDURE', name: '시술 문의', description: '시술 종류/방법 관련 문의' },
            { code: 'SKINCARE', name: '피부관리 문의', description: '피부 관리 상담' },
            { code: 'SIDE_EFFECT', name: '부작용 문의', description: '시술 후 부작용 관련 문의' },
            { code: 'OTHER', name: '기타', description: '기타 문의' },
          ],
        },
        system_prompt: `당신은 전문적인 피부과 상담 AI 어시스턴트입니다.
피부 고민과 시술에 대해 친절하게 상담해 주세요.
개인별 피부 상태에 따라 적합한 시술이 다를 수 있으므로, 정확한 상담은 내원을 권유하세요.
시술 후 주의사항과 관리 방법도 안내해 주세요.`,
        extraction_schema: {
          fields: [
            { name: 'skin_concern', type: 'string', description: '피부 고민' },
            { name: 'procedure_interest', type: 'array', description: '관심 시술' },
            { name: 'preferred_date', type: 'date', description: '희망 예약 날짜' },
            { name: 'budget', type: 'number', description: '예산 범위' },
          ],
        },
        default_templates: {
          greeting: '안녕하세요! {business_name}입니다. 피부 고민 상담 도와드릴게요.',
        },
      },
    }),
    prisma.industryConfig.create({
      data: {
        industry: 'HOSPITAL',
        display_name: '병원',
        inquiry_types: {
          types: [
            { code: 'RESERVATION', name: '예약 문의', description: '진료 예약 관련 문의' },
            { code: 'DEPARTMENT', name: '진료과 문의', description: '진료과 안내 문의' },
            {
              code: 'VISITING_HOURS',
              name: '면회시간 문의',
              description: '입원 환자 면회 관련 문의',
            },
            { code: 'MEDICAL_RECORD', name: '의무기록 문의', description: '진료기록 발급 문의' },
            { code: 'INSURANCE', name: '보험 문의', description: '의료보험 관련 문의' },
            { code: 'EMERGENCY', name: '응급 문의', description: '응급실 관련 문의' },
            { code: 'OTHER', name: '기타', description: '기타 문의' },
          ],
        },
        system_prompt: `당신은 종합병원 안내 AI 어시스턴트입니다.
환자분들과 보호자분들의 문의에 정확하고 친절하게 답변해 주세요.
응급 상황의 경우 119 신고를 먼저 안내하고, 응급실 위치를 안내해 주세요.
진료 예약과 진료과 안내, 입원 관련 정보를 제공합니다.`,
        extraction_schema: {
          fields: [
            { name: 'department', type: 'string', description: '진료과' },
            { name: 'patient_name', type: 'string', description: '환자명' },
            { name: 'symptoms', type: 'array', description: '증상' },
            { name: 'preferred_date', type: 'date', description: '희망 예약일' },
            { name: 'is_emergency', type: 'boolean', description: '응급 여부' },
          ],
        },
        default_templates: {
          greeting: '안녕하세요! {business_name}입니다. 무엇을 도와드릴까요?',
          emergency: '응급 상황이시면 119에 먼저 연락해 주세요. 응급실은 24시간 운영됩니다.',
        },
      },
    }),
    prisma.industryConfig.create({
      data: {
        industry: 'REAL_ESTATE',
        display_name: '부동산',
        inquiry_types: {
          types: [
            { code: 'SALE', name: '매매 문의', description: '매매 물건 관련 문의' },
            { code: 'RENT', name: '임대 문의', description: '월세/전세 관련 문의' },
            { code: 'VIEWING', name: '방문 문의', description: '물건 방문 예약 문의' },
            { code: 'PRICE', name: '시세 문의', description: '시세/가격 관련 문의' },
            { code: 'CONTRACT', name: '계약 문의', description: '계약 절차 관련 문의' },
            { code: 'OTHER', name: '기타', description: '기타 문의' },
          ],
        },
        system_prompt: `당신은 전문 부동산 상담 AI 어시스턴트입니다.
매물 정보와 거래 절차에 대해 정확하게 안내해 주세요.
가격 협상이나 구체적인 계약 조건은 담당자 상담을 안내하세요.
방문 예약을 적극적으로 유도해 주세요.`,
        extraction_schema: {
          fields: [
            {
              name: 'property_type',
              type: 'string',
              description: '매물 유형 (아파트, 오피스텔 등)',
            },
            {
              name: 'transaction_type',
              type: 'string',
              description: '거래 유형 (매매, 전세, 월세)',
            },
            { name: 'location', type: 'string', description: '희망 지역' },
            { name: 'budget', type: 'object', description: '예산 범위' },
            { name: 'move_in_date', type: 'date', description: '입주 희망일' },
          ],
        },
        default_templates: {
          greeting: '안녕하세요! {business_name}입니다. 어떤 매물을 찾고 계신가요?',
        },
      },
    }),
    prisma.industryConfig.create({
      data: {
        industry: 'BEAUTY_SALON',
        display_name: '미용실',
        inquiry_types: {
          types: [
            { code: 'RESERVATION', name: '예약 문의', description: '헤어/네일 예약 문의' },
            { code: 'PRICE', name: '가격 문의', description: '시술 가격 관련 문의' },
            { code: 'STYLE', name: '스타일 문의', description: '헤어 스타일 상담' },
            { code: 'PRODUCT', name: '제품 문의', description: '헤어 제품 관련 문의' },
            { code: 'HOURS', name: '운영시간 문의', description: '영업 시간 문의' },
            { code: 'OTHER', name: '기타', description: '기타 문의' },
          ],
        },
        system_prompt: `당신은 친절한 미용실 상담 AI 어시스턴트입니다.
고객님의 헤어 스타일 고민을 들어주고, 적합한 스타일을 추천해 주세요.
예약 가능한 시간과 디자이너를 안내해 주세요.
가격은 시술 내용에 따라 달라질 수 있음을 안내해 주세요.`,
        extraction_schema: {
          fields: [
            {
              name: 'service_type',
              type: 'array',
              description: '원하는 서비스 (커트, 펌, 염색 등)',
            },
            { name: 'preferred_designer', type: 'string', description: '선호 디자이너' },
            { name: 'preferred_date', type: 'date', description: '희망 예약 날짜' },
            { name: 'preferred_time', type: 'time', description: '희망 예약 시간' },
            { name: 'hair_length', type: 'string', description: '현재 머리 길이' },
          ],
        },
        default_templates: {
          greeting: '안녕하세요! {business_name}입니다. 오늘 어떤 스타일을 원하세요?',
        },
      },
    }),
    prisma.industryConfig.create({
      data: {
        industry: 'PLASTIC_SURGERY',
        display_name: '성형외과',
        inquiry_types: {
          types: [
            { code: 'CONSULTATION', name: '상담 예약', description: '성형 상담 예약 문의' },
            { code: 'PRICE', name: '비용 문의', description: '수술 비용 관련 문의' },
            { code: 'PROCEDURE', name: '수술 문의', description: '수술 방법/종류 관련 문의' },
            { code: 'RECOVERY', name: '회복 문의', description: '수술 후 회복 관련 문의' },
            { code: 'REVISION', name: '재수술 문의', description: '재수술 관련 문의' },
            { code: 'OTHER', name: '기타', description: '기타 문의' },
          ],
        },
        system_prompt: `당신은 성형외과 상담 AI 어시스턴트입니다.
고객님의 고민을 경청하고, 적합한 수술 방법을 안내해 주세요.
정확한 수술 결정은 반드시 전문의 상담 후에 이루어져야 함을 안내하세요.
수술 전후 주의사항과 회복 기간에 대해 상세히 안내해 주세요.`,
        extraction_schema: {
          fields: [
            { name: 'procedure_interest', type: 'array', description: '관심 수술' },
            { name: 'concern', type: 'string', description: '고민 부위/내용' },
            { name: 'preferred_date', type: 'date', description: '상담 희망일' },
            { name: 'budget', type: 'number', description: '예산' },
            { name: 'previous_surgery', type: 'boolean', description: '이전 수술 경험' },
          ],
        },
        default_templates: {
          greeting: '안녕하세요! {business_name}입니다. 어떤 부분이 고민이신가요?',
        },
      },
    }),
    prisma.industryConfig.create({
      data: {
        industry: 'ACADEMY',
        display_name: '학원',
        inquiry_types: {
          types: [
            { code: 'ENROLLMENT', name: '등록 문의', description: '수강 등록 관련 문의' },
            { code: 'PRICE', name: '수강료 문의', description: '수강료 관련 문의' },
            { code: 'CURRICULUM', name: '커리큘럼 문의', description: '강의 내용/일정 관련 문의' },
            { code: 'LEVEL_TEST', name: '레벨테스트 문의', description: '레벨 테스트 관련 문의' },
            { code: 'SCHEDULE', name: '시간표 문의', description: '수업 시간 관련 문의' },
            { code: 'OTHER', name: '기타', description: '기타 문의' },
          ],
        },
        system_prompt: `당신은 학원 상담 AI 어시스턴트입니다.
학생과 학부모님의 문의에 친절하게 답변해 주세요.
수강 과목과 수업 시간, 수강료에 대해 안내해 주세요.
레벨 테스트 예약을 적극적으로 권유하세요.`,
        extraction_schema: {
          fields: [
            { name: 'student_grade', type: 'string', description: '학생 학년' },
            { name: 'subject', type: 'array', description: '관심 과목' },
            { name: 'preferred_schedule', type: 'array', description: '선호 수업 시간' },
            { name: 'goal', type: 'string', description: '학습 목표' },
          ],
        },
        default_templates: {
          greeting: '안녕하세요! {business_name}입니다. 어떤 과목에 관심이 있으신가요?',
        },
      },
    }),
    prisma.industryConfig.create({
      data: {
        industry: 'LAW_FIRM',
        display_name: '법률 상담소',
        inquiry_types: {
          types: [
            { code: 'CONSULTATION', name: '상담 예약', description: '법률 상담 예약 문의' },
            { code: 'CASE_TYPE', name: '사건 유형 문의', description: '담당 사건 유형 문의' },
            { code: 'FEE', name: '비용 문의', description: '상담/수임료 관련 문의' },
            { code: 'DOCUMENT', name: '서류 문의', description: '필요 서류 관련 문의' },
            { code: 'PROGRESS', name: '진행 상황 문의', description: '사건 진행 상황 문의' },
            { code: 'OTHER', name: '기타', description: '기타 문의' },
          ],
        },
        system_prompt: `당신은 법률 상담소 AI 어시스턴트입니다.
법률 상담 예약과 기본적인 절차 안내를 도와드립니다.
구체적인 법률 자문은 변호사 상담을 통해 받으실 수 있음을 안내하세요.
개인정보와 사건 내용은 신중하게 다루어 주세요.`,
        extraction_schema: {
          fields: [
            { name: 'case_type', type: 'string', description: '사건 유형 (민사, 형사, 가사 등)' },
            { name: 'brief_description', type: 'string', description: '간단한 사건 개요' },
            { name: 'preferred_date', type: 'date', description: '상담 희망일' },
            { name: 'urgency', type: 'string', description: '긴급도' },
          ],
        },
        default_templates: {
          greeting: '안녕하세요! {business_name}입니다. 어떤 법률 문제로 상담이 필요하신가요?',
        },
      },
    }),
    prisma.industryConfig.create({
      data: {
        industry: 'OTHER',
        display_name: '기타',
        inquiry_types: {
          types: [
            { code: 'GENERAL', name: '일반 문의', description: '일반 문의' },
            { code: 'PRICE', name: '가격 문의', description: '가격 관련 문의' },
            { code: 'RESERVATION', name: '예약 문의', description: '예약 관련 문의' },
            { code: 'COMPLAINT', name: '불만/개선', description: '불만 사항 및 개선 요청' },
            { code: 'OTHER', name: '기타', description: '기타 문의' },
          ],
        },
        system_prompt: `당신은 친절한 고객 상담 AI 어시스턴트입니다.
고객님의 문의에 정확하고 친절하게 답변해 주세요.
해결이 어려운 문의는 담당자 연결을 안내해 주세요.`,
        extraction_schema: {
          fields: [
            { name: 'inquiry_subject', type: 'string', description: '문의 주제' },
            { name: 'contact', type: 'string', description: '연락처' },
          ],
        },
        default_templates: {
          greeting: '안녕하세요! {business_name}입니다. 무엇을 도와드릴까요?',
        },
      },
    }),
  ]);

  console.log(`✅ Created ${configs.length} industry configs`);
  return configs;
}
