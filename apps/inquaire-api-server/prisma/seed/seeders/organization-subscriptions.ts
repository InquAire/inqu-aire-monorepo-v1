import type {
  Organization,
  OrganizationPayment,
  OrganizationSubscription,
  PrismaClient,
} from '../../generated';

export async function seedOrganizationSubscriptions(
  prisma: PrismaClient,
  organizations: Organization[]
): Promise<{ subscriptions: OrganizationSubscription[]; payments: OrganizationPayment[] }> {
  console.log('💳 Creating organization subscriptions...');

  const now = new Date();
  const subscriptions: OrganizationSubscription[] = [];
  const payments: OrganizationPayment[] = [];

  // 서울치과그룹 - Enterprise Plan (Active)
  const sub1 = await prisma.organizationSubscription.create({
    data: {
      organization_id: organizations[0].id,
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      monthly_limit: 999999,
      current_usage: 1500,
      max_businesses: 10,
      max_members: 50,
      billing_cycle_start: new Date(now.getFullYear(), now.getMonth(), 1),
      billing_cycle_end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    },
  });
  subscriptions.push(sub1);

  payments.push(
    await prisma.organizationPayment.create({
      data: {
        organization_id: organizations[0].id,
        subscription_id: sub1.id,
        amount: 990000,
        currency: 'KRW',
        status: 'COMPLETED',
        payment_method: 'CARD',
        payment_key: `toss_${organizations[0].id}_001`,
        paid_at: new Date(now.getFullYear(), now.getMonth(), 1),
      },
    })
  );

  // 강남의료센터 - Pro Plan (Active)
  const sub2 = await prisma.organizationSubscription.create({
    data: {
      organization_id: organizations[1].id,
      plan: 'PRO',
      status: 'ACTIVE',
      monthly_limit: 5000,
      current_usage: 2300,
      max_businesses: 5,
      max_members: 20,
      billing_cycle_start: new Date(now.getFullYear(), now.getMonth(), 1),
      billing_cycle_end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    },
  });
  subscriptions.push(sub2);

  payments.push(
    await prisma.organizationPayment.create({
      data: {
        organization_id: organizations[1].id,
        subscription_id: sub2.id,
        amount: 290000,
        currency: 'KRW',
        status: 'COMPLETED',
        payment_method: 'CARD',
        payment_key: `toss_${organizations[1].id}_001`,
        paid_at: new Date(now.getFullYear(), now.getMonth(), 1),
      },
    })
  );

  // 부동산 프로 - Basic Plan (Active)
  const sub3 = await prisma.organizationSubscription.create({
    data: {
      organization_id: organizations[2].id,
      plan: 'BASIC',
      status: 'ACTIVE',
      monthly_limit: 1000,
      current_usage: 450,
      max_businesses: 2,
      max_members: 5,
      billing_cycle_start: new Date(now.getFullYear(), now.getMonth(), 1),
      billing_cycle_end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    },
  });
  subscriptions.push(sub3);

  payments.push(
    await prisma.organizationPayment.create({
      data: {
        organization_id: organizations[2].id,
        subscription_id: sub3.id,
        amount: 99000,
        currency: 'KRW',
        status: 'COMPLETED',
        payment_method: 'TRANSFER',
        payment_key: `toss_${organizations[2].id}_001`,
        paid_at: new Date(now.getFullYear(), now.getMonth(), 1),
      },
    })
  );

  // 뷰티케어 그룹 - Trial Plan
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  const sub4 = await prisma.organizationSubscription.create({
    data: {
      organization_id: organizations[3].id,
      plan: 'TRIAL',
      status: 'TRIAL',
      monthly_limit: 100,
      current_usage: 25,
      max_businesses: 1,
      max_members: 3,
      billing_cycle_start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
      billing_cycle_end: trialEnd,
      trial_ends_at: trialEnd,
    },
  });
  subscriptions.push(sub4);

  console.log(`✅ Created ${subscriptions.length} organization subscriptions`);
  console.log(`✅ Created ${payments.length} organization payments`);

  return { subscriptions, payments };
}
