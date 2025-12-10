import type { Business, DailyStats, PrismaClient } from '../../generated';

export async function seedDailyStats(
  prisma: PrismaClient,
  businesses: Business[]
): Promise<DailyStats[]> {
  console.log('📊 Creating daily stats...');

  const dailyStats: DailyStats[] = [];

  for (const business of businesses) {
    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.now() - 1000 * 60 * 60 * 24 * i);
      date.setHours(0, 0, 0, 0);

      const stats = await prisma.dailyStats.create({
        data: {
          business_id: business.id,
          date,
          total_inquiries: Math.floor(Math.random() * 50) + 10,
          new_inquiries: Math.floor(Math.random() * 20) + 5,
          in_progress_inquiries: Math.floor(Math.random() * 15) + 3,
          completed_inquiries: Math.floor(Math.random() * 30) + 10,
          on_hold_inquiries: Math.floor(Math.random() * 5),
          unique_customers: Math.floor(Math.random() * 30) + 5,
          avg_response_time: Math.random() * 300 + 60,
          avg_ai_confidence: 0.8 + Math.random() * 0.2,
          inquiry_types: {
            예약문의: Math.floor(Math.random() * 20),
            가격문의: Math.floor(Math.random() * 15),
            상담문의: Math.floor(Math.random() * 10),
            긴급문의: Math.floor(Math.random() * 5),
          },
        },
      });
      dailyStats.push(stats);
    }
  }

  console.log(`✅ Created ${dailyStats.length} daily stats records`);
  return dailyStats;
}
