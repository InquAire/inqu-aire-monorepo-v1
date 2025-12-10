/**
 * Inquiry templates by industry type
 */
export const inquiryTemplates: Record<
  string,
  Array<{ text: string; type: string; sentiment: string; urgency: string }>
> = {
  DENTAL: [
    {
      text: '임플란트 가격이 얼마인가요?',
      type: '가격문의',
      sentiment: 'NEUTRAL',
      urgency: 'MEDIUM',
    },
    {
      text: '예약 가능한 날짜가 언제인가요?',
      type: '예약문의',
      sentiment: 'POSITIVE',
      urgency: 'HIGH',
    },
    {
      text: '치아 교정 상담 받고 싶어요',
      type: '상담문의',
      sentiment: 'POSITIVE',
      urgency: 'MEDIUM',
    },
    {
      text: '스케일링 비용이 얼마나 하나요?',
      type: '가격문의',
      sentiment: 'NEUTRAL',
      urgency: 'LOW',
    },
    {
      text: '급하게 예약 가능할까요? 치통이 심해서요',
      type: '긴급예약',
      sentiment: 'NEGATIVE',
      urgency: 'HIGH',
    },
  ],
  DERMATOLOGY: [
    {
      text: '레이저 시술 예약 가능한가요?',
      type: '예약문의',
      sentiment: 'POSITIVE',
      urgency: 'MEDIUM',
    },
    {
      text: '여드름 치료 비용이 궁금해요',
      type: '가격문의',
      sentiment: 'NEUTRAL',
      urgency: 'LOW',
    },
    {
      text: '보톡스 상담받고 싶습니다',
      type: '상담문의',
      sentiment: 'POSITIVE',
      urgency: 'MEDIUM',
    },
    {
      text: '피부과 진료 시간이 어떻게 되나요?',
      type: '정보문의',
      sentiment: 'NEUTRAL',
      urgency: 'LOW',
    },
    {
      text: '리프팅 시술 후기 알려주세요',
      type: '정보문의',
      sentiment: 'NEUTRAL',
      urgency: 'LOW',
    },
  ],
  PLASTIC_SURGERY: [
    {
      text: '쌍꺼풀 수술 상담 받고 싶어요',
      type: '상담문의',
      sentiment: 'POSITIVE',
      urgency: 'MEDIUM',
    },
    {
      text: '코 성형 비용이 얼마나 하나요?',
      type: '가격문의',
      sentiment: 'NEUTRAL',
      urgency: 'MEDIUM',
    },
    {
      text: '윤곽 수술 예약 가능한가요?',
      type: '예약문의',
      sentiment: 'POSITIVE',
      urgency: 'HIGH',
    },
    {
      text: '가슴 성형 후기 알려주세요',
      type: '정보문의',
      sentiment: 'NEUTRAL',
      urgency: 'LOW',
    },
    {
      text: '지방흡입 상담 가능한가요?',
      type: '상담문의',
      sentiment: 'NEUTRAL',
      urgency: 'MEDIUM',
    },
  ],
  REAL_ESTATE: [
    {
      text: '강남역 근처 원룸 매물 있나요?',
      type: '매물문의',
      sentiment: 'NEUTRAL',
      urgency: 'MEDIUM',
    },
    {
      text: '전세 2억 이하로 찾고 있어요',
      type: '매물문의',
      sentiment: 'NEUTRAL',
      urgency: 'HIGH',
    },
    {
      text: '이 매물 실제로 보고 싶은데 가능한가요?',
      type: '방문예약',
      sentiment: 'POSITIVE',
      urgency: 'HIGH',
    },
    {
      text: '역세권 오피스텔 추천 부탁드려요',
      type: '매물문의',
      sentiment: 'NEUTRAL',
      urgency: 'MEDIUM',
    },
    {
      text: '월세 보증금 조정 가능한가요?',
      type: '가격협상',
      sentiment: 'NEUTRAL',
      urgency: 'MEDIUM',
    },
  ],
  HOSPITAL: [
    {
      text: '내과 진료 예약하고 싶어요',
      type: '예약문의',
      sentiment: 'NEUTRAL',
      urgency: 'MEDIUM',
    },
    {
      text: '건강검진 비용이 얼마인가요?',
      type: '가격문의',
      sentiment: 'NEUTRAL',
      urgency: 'LOW',
    },
    {
      text: '급하게 응급실 가능한가요?',
      type: '긴급문의',
      sentiment: 'NEGATIVE',
      urgency: 'HIGH',
    },
    {
      text: '소아과 진료 시간 알려주세요',
      type: '정보문의',
      sentiment: 'NEUTRAL',
      urgency: 'LOW',
    },
    {
      text: 'MRI 검사 예약 가능한가요?',
      type: '예약문의',
      sentiment: 'NEUTRAL',
      urgency: 'MEDIUM',
    },
  ],
  BEAUTY_SALON: [
    { text: '펌 가격이 얼마인가요?', type: '가격문의', sentiment: 'NEUTRAL', urgency: 'LOW' },
    { text: '오늘 예약 가능한가요?', type: '예약문의', sentiment: 'POSITIVE', urgency: 'HIGH' },
    {
      text: '염색하고 싶은데 상담 가능할까요?',
      type: '상담문의',
      sentiment: 'POSITIVE',
      urgency: 'MEDIUM',
    },
    {
      text: '웨딩헤어 예약하고 싶어요',
      type: '예약문의',
      sentiment: 'POSITIVE',
      urgency: 'MEDIUM',
    },
    {
      text: '탈색 후 트리트먼트 추천해주세요',
      type: '정보문의',
      sentiment: 'NEUTRAL',
      urgency: 'LOW',
    },
  ],
  ACADEMY: [
    {
      text: '수학 과외 가능한가요?',
      type: '수업문의',
      sentiment: 'NEUTRAL',
      urgency: 'MEDIUM',
    },
    {
      text: '학원비가 얼마인가요?',
      type: '가격문의',
      sentiment: 'NEUTRAL',
      urgency: 'LOW',
    },
    {
      text: '시험 대비 특강 있나요?',
      type: '정보문의',
      sentiment: 'NEUTRAL',
      urgency: 'HIGH',
    },
    {
      text: '레벨 테스트 가능한가요?',
      type: '상담문의',
      sentiment: 'POSITIVE',
      urgency: 'MEDIUM',
    },
    {
      text: '중학생 수업 시간 알려주세요',
      type: '정보문의',
      sentiment: 'NEUTRAL',
      urgency: 'LOW',
    },
  ],
  LAW_FIRM: [
    {
      text: '이혼 소송 상담 받고 싶습니다',
      type: '상담문의',
      sentiment: 'NEGATIVE',
      urgency: 'HIGH',
    },
    {
      text: '변호사 비용이 얼마나 하나요?',
      type: '가격문의',
      sentiment: 'NEUTRAL',
      urgency: 'MEDIUM',
    },
    {
      text: '형사 사건 변호 가능한가요?',
      type: '정보문의',
      sentiment: 'NEGATIVE',
      urgency: 'HIGH',
    },
    {
      text: '계약서 검토 부탁드립니다',
      type: '업무문의',
      sentiment: 'NEUTRAL',
      urgency: 'MEDIUM',
    },
    {
      text: '무료 법률 상담 가능한가요?',
      type: '상담문의',
      sentiment: 'NEUTRAL',
      urgency: 'LOW',
    },
  ],
  OTHER: [
    {
      text: '서비스 이용 방법이 궁금해요',
      type: '정보문의',
      sentiment: 'NEUTRAL',
      urgency: 'LOW',
    },
    {
      text: '예약하고 싶은데 가능한가요?',
      type: '예약문의',
      sentiment: 'POSITIVE',
      urgency: 'MEDIUM',
    },
    {
      text: '가격이 얼마인가요?',
      type: '가격문의',
      sentiment: 'NEUTRAL',
      urgency: 'LOW',
    },
    {
      text: '상담 받고 싶습니다',
      type: '상담문의',
      sentiment: 'POSITIVE',
      urgency: 'MEDIUM',
    },
    {
      text: '영업시간이 어떻게 되나요?',
      type: '정보문의',
      sentiment: 'NEUTRAL',
      urgency: 'LOW',
    },
  ],
};

/**
 * Customer names for mock data
 */
export const customerNames = [
  '홍길동',
  '김영희',
  '이철수',
  '박민지',
  '최지훈',
  '정수연',
  '강동원',
  '윤아름',
  '임재범',
  '송하늘',
  '오세훈',
  '한지민',
  '류현진',
  '배수지',
  '서강준',
  '김태희',
  '이민호',
  '전지현',
  '조인성',
  '손예진',
];

/**
 * Reply template configurations
 */
export const replyTemplateConfigs = [
  {
    name: '예약 안내',
    type: '예약문의',
    content:
      '안녕하세요 {{customer_name}}님, 예약 문의 감사합니다. 현재 {{available_dates}}에 예약 가능합니다.',
    variables: ['customer_name', 'available_dates'],
  },
  {
    name: '가격 안내',
    type: '가격문의',
    content:
      '{{customer_name}}님, 문의하신 {{service_name}}의 가격은 {{price}}원입니다. 자세한 상담은 방문 시 가능합니다.',
    variables: ['customer_name', 'service_name', 'price'],
  },
  {
    name: '긴급 응대',
    type: '긴급문의',
    content:
      '{{customer_name}}님, 긴급 문의 확인했습니다. 빠른 시일 내에 연락드리겠습니다. 연락처: {{phone}}',
    variables: ['customer_name', 'phone'],
  },
];
