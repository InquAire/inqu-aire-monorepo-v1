import type { Business, Payment, PrismaClient, Subscription } from '../../generated';

export async function seedSubscriptionsAndPayments(
  prisma: PrismaClient,
  businesses: Business[]
): Promise<{ subscriptions: Subscription[]; payments: Payment[] }> {
  console.log('💳 Creating subscriptions and payments...');

  const subscriptions: Subscription[] = [];
  const payments: Payment[] = [];

  for (const [idx, business] of businesses.entries()) {
    const plans: Array<'TRIAL' | 'BASIC' | 'PRO' | 'ENTERPRISE'> = [
      'TRIAL',
      'BASIC',
      'PRO',
      'ENTERPRISE',
    ];
    const plan = plans[idx % plans.length];
    const limits = { TRIAL: 100, BASIC: 1000, PRO: 5000, ENTERPRISE: 999999 };

    const subscription = await prisma.subscription.create({
      data: {
        business_id: business.id,
        plan,
        status: idx < 4 ? 'ACTIVE' : 'TRIAL',
        monthly_limit: limits[plan],
        current_usage: Math.floor(Math.random() * limits[plan] * 0.3),
        billing_cycle_start: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
        billing_cycle_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15),
        trial_ends_at: plan === 'TRIAL' ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) : null,
      },
    });
    subscriptions.push(subscription);

    // Add payment history for non-trial plans
    if (plan !== 'TRIAL' && idx < 4) {
      const prices = { BASIC: 39000, PRO: 89000, ENTERPRISE: 200000 };
      const payment = await prisma.payment.create({
        data: {
          business_id: business.id,
          subscription_id: subscription.id,
          amount: prices[plan as keyof typeof prices],
          currency: 'KRW',
          status: 'COMPLETED',
          payment_method: 'card',
          payment_key: `pay_${business.id}_${Date.now()}`,
          paid_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
        },
      });
      payments.push(payment);
    }
  }

  console.log(`✅ Created ${subscriptions.length} subscriptions and ${payments.length} payments`);
  return { subscriptions, payments };
}
