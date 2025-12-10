import type { Organization, OrganizationMember, PrismaClient, User } from '../../generated';

export async function seedOrganizationMembers(
  prisma: PrismaClient,
  organizations: Organization[],
  users: User[]
): Promise<OrganizationMember[]> {
  console.log('👥 Creating organization members...');

  const members: OrganizationMember[] = [];

  // 서울치과그룹 멤버
  members.push(
    await prisma.organizationMember.create({
      data: {
        organization_id: organizations[0].id,
        user_id: users[0].id,
        role: 'OWNER',
        permissions: ['all'],
      },
    })
  );

  members.push(
    await prisma.organizationMember.create({
      data: {
        organization_id: organizations[0].id,
        user_id: users[1].id,
        role: 'ADMIN',
        permissions: ['manage_members', 'manage_settings'],
        invited_by: users[0].id,
      },
    })
  );

  // 강남의료센터 멤버
  members.push(
    await prisma.organizationMember.create({
      data: {
        organization_id: organizations[1].id,
        user_id: users[1].id,
        role: 'OWNER',
        permissions: ['all'],
      },
    })
  );

  members.push(
    await prisma.organizationMember.create({
      data: {
        organization_id: organizations[1].id,
        user_id: users[3].id,
        role: 'MANAGER',
        permissions: ['manage_inquiries', 'view_reports'],
        invited_by: users[1].id,
      },
    })
  );

  // 부동산 프로 멤버
  members.push(
    await prisma.organizationMember.create({
      data: {
        organization_id: organizations[2].id,
        user_id: users[2].id,
        role: 'OWNER',
        permissions: ['all'],
      },
    })
  );

  members.push(
    await prisma.organizationMember.create({
      data: {
        organization_id: organizations[2].id,
        user_id: users[4].id,
        role: 'MEMBER',
        permissions: ['view_inquiries', 'respond_inquiries'],
        invited_by: users[2].id,
      },
    })
  );

  // 뷰티케어 그룹 멤버
  members.push(
    await prisma.organizationMember.create({
      data: {
        organization_id: organizations[3].id,
        user_id: users[4].id,
        role: 'OWNER',
        permissions: ['all'],
      },
    })
  );

  members.push(
    await prisma.organizationMember.create({
      data: {
        organization_id: organizations[3].id,
        user_id: users[0].id,
        role: 'VIEWER',
        permissions: ['view_only'],
        invited_by: users[4].id,
      },
    })
  );

  console.log(`✅ Created ${members.length} organization members`);
  return members;
}
