import type { Business, Organization, PrismaClient } from '../../generated';

export async function seedBusinesses(
  prisma: PrismaClient,
  organizations: Organization[]
): Promise<Business[]> {
  console.log('🏢 Creating businesses...');

  const businesses = await Promise.all([
    // 서울치과그룹 소속 비즈니스
    prisma.business.create({
      data: {
        organization_id: organizations[0].id,
        name: '서울치과의원',
        industry_type: 'DENTAL',
        address: '서울시 강남구 테헤란로 123',
        phone: '02-1234-5678',
        website: 'https://seoul-dental.com',
        settings: {
          auto_reply: true,
          business_hours: {
            mon: { open: '09:00', close: '18:00' },
            tue: { open: '09:00', close: '18:00' },
            wed: { open: '09:00', close: '18:00' },
            thu: { open: '09:00', close: '18:00' },
            fri: { open: '09:00', close: '18:00' },
            sat: { open: '09:00', close: '13:00' },
            sun: null,
          },
        },
      },
    }),
    prisma.business.create({
      data: {
        organization_id: organizations[0].id,
        name: '연세치과',
        industry_type: 'DENTAL',
        address: '서울시 송파구 송파대로 303',
        phone: '02-2222-3333',
        website: 'https://yonsei-dental.com',
        settings: {
          auto_reply: true,
          business_hours: {
            mon: { open: '10:00', close: '19:00' },
            tue: { open: '10:00', close: '19:00' },
            wed: { open: '10:00', close: '19:00' },
            thu: { open: '10:00', close: '21:00' },
            fri: { open: '10:00', close: '19:00' },
            sat: { open: '10:00', close: '15:00' },
            sun: null,
          },
        },
      },
    }),
    // 강남의료센터 소속 비즈니스
    prisma.business.create({
      data: {
        organization_id: organizations[1].id,
        name: '강남피부과',
        industry_type: 'DERMATOLOGY',
        address: '서울시 강남구 논현로 456',
        phone: '02-9876-5432',
        website: 'https://gangnam-derma.com',
        settings: {
          auto_reply: true,
          consultation_required: true,
        },
      },
    }),
    prisma.business.create({
      data: {
        organization_id: organizations[1].id,
        name: '서울대병원',
        industry_type: 'HOSPITAL',
        address: '서울시 종로구 대학로 101',
        phone: '02-7777-8888',
        website: 'https://snuh.org',
        settings: {
          auto_reply: true,
          emergency_contact: '02-7777-9999',
          departments: ['내과', '외과', '소아과', '산부인과', '정형외과'],
        },
      },
    }),
    // 부동산 프로 소속 비즈니스
    prisma.business.create({
      data: {
        organization_id: organizations[2].id,
        name: '부동산119',
        industry_type: 'REAL_ESTATE',
        address: '서울시 서초구 서초대로 789',
        phone: '02-5555-6666',
        website: 'https://estate119.com',
        settings: {
          auto_reply: true,
          service_areas: ['강남구', '서초구', '송파구'],
        },
      },
    }),
    // 뷰티케어 그룹 소속 비즈니스
    prisma.business.create({
      data: {
        organization_id: organizations[3].id,
        name: '스타일헤어',
        industry_type: 'BEAUTY_SALON',
        address: '서울시 마포구 홍대입구 202',
        phone: '02-3333-4444',
        website: 'https://style-hair.com',
        settings: {
          auto_reply: true,
          designers: ['김디자이너', '이디자이너', '박디자이너'],
          services: ['커트', '펌', '염색', '클리닉', '두피케어'],
        },
      },
    }),
  ]);

  console.log(`✅ Created ${businesses.length} businesses`);
  return businesses;
}
