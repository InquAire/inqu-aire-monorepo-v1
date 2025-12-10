import type { Business, Customer, PrismaClient } from '../../generated';
import { customerNames } from '../data/templates';

export async function seedCustomers(
  prisma: PrismaClient,
  businesses: Business[]
): Promise<Customer[]> {
  console.log('👥 Creating customers...');

  const customers: Customer[] = [];

  for (const [idx, business] of businesses.entries()) {
    for (let i = 0; i < 15; i++) {
      const name = customerNames[(idx * 15 + i) % customerNames.length];
      const customer = await prisma.customer.create({
        data: {
          business_id: business.id,
          platform_user_id: `user_${business.id}_${i}`,
          platform: idx % 2 === 0 ? 'KAKAO' : 'LINE',
          name,
          phone: `010-${String(1000 + idx * 100 + i).padStart(4, '0')}-${String(1000 + i).padStart(4, '0')}`,
          email: i % 3 === 0 ? `${name.toLowerCase()}${i}@example.com` : null,
          tags: i % 5 === 0 ? ['VIP', '단골고객'] : i % 3 === 0 ? ['신규'] : [],
          first_contact: new Date(Date.now() - 1000 * 60 * 60 * 24 * (90 - i * 3)),
          last_contact: new Date(Date.now() - 1000 * 60 * 60 * 24 * (i % 7)),
          inquiry_count: Math.floor(Math.random() * 20) + 1,
        },
      });
      customers.push(customer);
    }
  }

  console.log(`✅ Created ${customers.length} customers`);
  return customers;
}
