import type { Organization, PrismaClient } from '../../generated';

export async function seedOrganizations(prisma: PrismaClient): Promise<Organization[]> {
  console.log('🏛️  Creating organizations...');

  const organizations = await Promise.all([
    prisma.organization.create({
      data: {
        name: '서울치과그룹',
        slug: 'seoul-dental-group',
        logo_url: 'https://example.com/logos/seoul-dental.png',
        description: '서울 지역 대표 치과 그룹입니다.',
        settings: {
          timezone: 'Asia/Seoul',
          language: 'ko',
          notifications: {
            email: true,
            push: true,
            sms: false,
          },
        },
      },
    }),
    prisma.organization.create({
      data: {
        name: '강남의료센터',
        slug: 'gangnam-medical',
        logo_url: 'https://example.com/logos/gangnam-medical.png',
        description: '강남 지역 종합 의료 서비스를 제공합니다.',
        settings: {
          timezone: 'Asia/Seoul',
          language: 'ko',
          notifications: {
            email: true,
            push: true,
            sms: true,
          },
        },
      },
    }),
    prisma.organization.create({
      data: {
        name: '부동산 프로',
        slug: 'realestate-pro',
        logo_url: 'https://example.com/logos/realestate.png',
        description: '전국 부동산 중개 네트워크입니다.',
        settings: {
          timezone: 'Asia/Seoul',
          language: 'ko',
          notifications: {
            email: true,
            push: false,
            sms: true,
          },
        },
      },
    }),
    prisma.organization.create({
      data: {
        name: '뷰티케어 그룹',
        slug: 'beauty-care',
        logo_url: 'https://example.com/logos/beauty.png',
        description: '프리미엄 뷰티 서비스를 제공합니다.',
        settings: {
          timezone: 'Asia/Seoul',
          language: 'ko',
          notifications: {
            email: true,
            push: true,
            sms: false,
          },
        },
      },
    }),
  ]);

  console.log(`✅ Created ${organizations.length} organizations`);
  return organizations;
}
