import * as crypto from 'crypto';

import type { Organization, OrganizationInvitation, PrismaClient, User } from '../../generated';

export async function seedOrganizationInvitations(
  prisma: PrismaClient,
  organizations: Organization[],
  users: User[]
): Promise<OrganizationInvitation[]> {
  console.log('📨 Creating organization invitations...');

  const now = new Date();
  const invitations: OrganizationInvitation[] = [];

  // 서울치과그룹에 대기 중인 초대
  invitations.push(
    await prisma.organizationInvitation.create({
      data: {
        organization_id: organizations[0].id,
        email: 'new.dentist@example.com',
        role: 'MEMBER',
        token: crypto.randomBytes(32).toString('hex'),
        invited_by: users[0].id,
        expires_at: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7), // 7일 후 만료
      },
    })
  );

  invitations.push(
    await prisma.organizationInvitation.create({
      data: {
        organization_id: organizations[0].id,
        email: 'manager@dental-clinic.com',
        role: 'MANAGER',
        token: crypto.randomBytes(32).toString('hex'),
        invited_by: users[0].id,
        expires_at: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7),
      },
    })
  );

  // 강남의료센터에 수락된 초대
  invitations.push(
    await prisma.organizationInvitation.create({
      data: {
        organization_id: organizations[1].id,
        email: users[3].email,
        role: 'MANAGER',
        token: crypto.randomBytes(32).toString('hex'),
        invited_by: users[1].id,
        expires_at: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7),
        accepted_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2), // 2일 전 수락
      },
    })
  );

  // 부동산 프로에 만료된 초대
  invitations.push(
    await prisma.organizationInvitation.create({
      data: {
        organization_id: organizations[2].id,
        email: 'expired.invite@example.com',
        role: 'MEMBER',
        token: crypto.randomBytes(32).toString('hex'),
        invited_by: users[2].id,
        expires_at: new Date(now.getTime() - 1000 * 60 * 60 * 24), // 어제 만료
      },
    })
  );

  // 뷰티케어 그룹에 대기 중인 초대들
  invitations.push(
    await prisma.organizationInvitation.create({
      data: {
        organization_id: organizations[3].id,
        email: 'stylist1@beauty.com',
        role: 'MEMBER',
        token: crypto.randomBytes(32).toString('hex'),
        invited_by: users[4].id,
        expires_at: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 5), // 5일 후 만료
      },
    })
  );

  invitations.push(
    await prisma.organizationInvitation.create({
      data: {
        organization_id: organizations[3].id,
        email: 'admin@beauty-salon.com',
        role: 'ADMIN',
        token: crypto.randomBytes(32).toString('hex'),
        invited_by: users[4].id,
        expires_at: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3), // 3일 후 만료
      },
    })
  );

  console.log(`✅ Created ${invitations.length} organization invitations`);
  return invitations;
}
