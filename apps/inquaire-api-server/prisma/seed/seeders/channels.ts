import type { Business, Channel, PrismaClient } from '../../generated';

export async function seedChannels(
  prisma: PrismaClient,
  businesses: Business[]
): Promise<Channel[]> {
  console.log('📡 Creating channels...');

  const channels: Channel[] = [];

  for (const [idx, business] of businesses.entries()) {
    // Kakao channel for all businesses
    const kakaoChannel = await prisma.channel.create({
      data: {
        business_id: business.id,
        platform: 'KAKAO',
        platform_channel_id: `@${business.name.toLowerCase().replace(/\s+/g, '')}`,
        name: `${business.name} 카카오톡`,
        webhook_url: `https://api.inquaire.com/webhooks/kakao/${business.id}_${idx}`,
        webhook_secret: `secret_${business.id}_kakao`,
        auto_reply_enabled: true,
        is_active: true,
      },
    });
    channels.push(kakaoChannel);

    // LINE channel for first 4 businesses
    if (idx < 4) {
      const lineChannel = await prisma.channel.create({
        data: {
          business_id: business.id,
          platform: 'LINE',
          platform_channel_id: `line_${business.id}`,
          name: `${business.name} LINE`,
          webhook_url: `https://api.inquaire.com/webhooks/line/${business.id}_${idx}`,
          webhook_secret: `secret_${business.id}_line`,
          auto_reply_enabled: false,
          is_active: true,
        },
      });
      channels.push(lineChannel);
    }
  }

  console.log(`✅ Created ${channels.length} channels`);
  return channels;
}
